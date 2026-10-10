import type { Request, Response } from "express";
import prisma from "../lib/db.js";
import AppError from "../lib/error/appError.js";
import { getUserId } from "../middleware/authmiddleware.js";
import { listRoadmapSummaries } from "../lib/roadmapSummary.js";
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

// Group with its roadmap summaries and combined progress
async function withRoadmaps<G extends { id: string }>(group: G, userId: string) {
  const { roadmaps } = await listRoadmapSummaries(
    { userId, examGroupId: group.id },
    { limit: MAX_ROADMAPS_PER_GROUP },
  );
  const totalTopics = roadmaps.reduce((n, r) => n + r.progress.totalTopics, 0);
  const completedTopics = roadmaps.reduce((n, r) => n + r.progress.completedTopics, 0);
  return {
    ...group,
    roadmaps,
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
    select: groupFields,
  });
  const examGroups = await Promise.all(groups.map((g) => withRoadmaps(g, userId)));

  res.status(200).json({ examGroups });
};

export const getExamGroupById = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { examGroupId } = examGroupParamsSchema.parse(req.params);

  const group = await prisma.examGroup.findUnique({
    where: { id: examGroupId, userId },
    select: groupFields,
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
