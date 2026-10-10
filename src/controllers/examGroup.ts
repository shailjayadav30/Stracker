import type { Request, Response } from "express";
import prisma from "../lib/db.js";
import AppError from "../lib/error/appError.js";
import { getUserId } from "../middleware/authmiddleware.js";
import { listRoadmapSummaries } from "../lib/roadmapSummary.js";
import { StoredSubjectsSchema } from "../lib/syllabus/analyze.js";
import type { Prisma } from "../generated/prisma/client.js";
import {
  deleteExamGroupQuerySchema,
  examGroupParamsSchema,
  nameBodySchema,
} from "../validationSchema/requestSchemas.js";

// A group holds at most one upload's subjects, so its roadmaps fit in one page
const MAX_ROADMAPS_PER_GROUP = 100;

const groupFields = {
  id: true,
  name: true,
  examOrBoard: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Plus the upload, to list every subject detected in the group's PDF
const groupDetailFields = {
  ...groupFields,
  upload: {
    select: {
      id: true,
      expiresAt: true,
      geminiFileName: true,
      analysis: { select: { subjectsJson: true } },
    },
  },
} as const satisfies Prisma.ExamGroupSelect;

type GroupRow = Prisma.ExamGroupGetPayload<{ select: typeof groupDetailFields }>;

// Group with its roadmap summaries, combined progress and all detected subjects
async function withRoadmaps({ upload, ...group }: GroupRow, userId: string) {
  const { roadmaps } = await listRoadmapSummaries(
    { userId, examGroupId: group.id },
    { limit: MAX_ROADMAPS_PER_GROUP },
  );
  const totalTopics = roadmaps.reduce((n, r) => n + r.progress.totalTopics, 0);
  const completedTopics = roadmaps.reduce((n, r) => n + r.progress.completedTopics, 0);

  // Generated roadmaps keep the subject's name and group, so match on those
  // (two subjects can share a name, e.g. "General Studies" in Paper I and Paper II)
  const key = (name: string, subjectGroup: string | null) =>
    `${name}\u0000${subjectGroup ?? ""}`;
  const roadmapIdByKey = new Map(
    roadmaps.map((r) => [key(r.name, r.subjectGroup), r.id]),
  );
  const detected = upload?.analysis
    ? StoredSubjectsSchema.parse(upload.analysis.subjectsJson)
    : [];

  return {
    ...group,
    // Send to POST /syllabus/:uploadId/roadmaps while canGenerate is true
    uploadId: upload?.id ?? null,
    canGenerate: Boolean(
      upload?.geminiFileName && upload.expiresAt > new Date(),
    ),
    roadmaps,
    subjects: detected.map((subject, index) => ({
      index,
      ...subject,
      roadmapId: roadmapIdByKey.get(key(subject.name, subject.group)) ?? null,
    })),
    progress: {
      totalTopics,
      completedTopics,
      percent: totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0,
    },
  };
}

export const getExamGroups = async (req: Request, res: Response) => {
  const userId = getUserId(req);

  const groups = await prisma.examGroup.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: groupDetailFields,
  });
  const examGroups = await Promise.all(groups.map((g) => withRoadmaps(g, userId)));

  res.status(200).json({ examGroups });
};

export const getExamGroupById = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { examGroupId } = examGroupParamsSchema.parse(req.params);

  const group = await prisma.examGroup.findUnique({
    where: { id: examGroupId, userId },
    select: groupDetailFields,
  });
  if (!group) {
    throw new AppError("Exam group not found", 404);
  }

  res.status(200).json({ examGroup: await withRoadmaps(group, userId) });
};

export const renameExamGroup = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { examGroupId } = examGroupParamsSchema.parse(req.params);
  const { name } = nameBodySchema.parse(req.body);

  const examGroup = await prisma.examGroup.update({
    where: { id: examGroupId, userId },
    data: { name },
    select: groupFields,
  });

  res.status(200).json({ message: "Exam group updated successfully", examGroup });
};

// ?deleteRoadmaps=true also deletes its roadmaps; otherwise they become ungrouped
export const deleteExamGroup = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { examGroupId } = examGroupParamsSchema.parse(req.params);
  const { deleteRoadmaps } = deleteExamGroupQuerySchema.parse(req.query);

  const deletedRoadmaps = await prisma.$transaction(async (tx) => {
    // Check ownership first so nothing is deleted for someone else's group
    await tx.examGroup.findUniqueOrThrow({
      where: { id: examGroupId, userId },
      select: { id: true },
    });
    const { count } = deleteRoadmaps
      ? await tx.roadmap.deleteMany({ where: { examGroupId, userId } })
      : { count: 0 };
    await tx.examGroup.delete({ where: { id: examGroupId } });
    return count;
  });

  res.status(200).json({ message: "Exam group deleted successfully", deletedRoadmaps });
};
