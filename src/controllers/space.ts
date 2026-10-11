import type { Request, Response } from "express";
import prisma from "../lib/db.js";
import { getUserId } from "../middleware/authmiddleware.js";
import { listRoadmapSummaries } from "../lib/roadmapSummary.js";
import { StoredSubjectsSchema } from "../lib/syllabus/analyze.js";
import { canGenerateFrom } from "../lib/syllabus/uploadFile.js";
import { assertSpace, roadmapIdsBySubject } from "../lib/spaces.js";
import { nameBodySchema, spaceParamsSchema } from "../validationSchema/requestSchemas.js";

// Roadmaps shown in one space (spaces hold a handful of subjects, so one page is enough)
const MAX_ROADMAPS_PER_SPACE = 100;

const spaceFields = { id: true, name: true, createdAt: true, updatedAt: true } as const;

type SpaceStatsRow = {
  spaceId: string;
  roadmapCount: number;
  totalTopics: number;
  completedTopics: number;
};

const percent = (done: number, total: number) =>
  total ? Math.round((done / total) * 100) : 0;

// GET /api/spaces: the user's spaces with roadmap count and combined progress
export const getSpaces = async (req: Request, res: Response) => {
  const userId = getUserId(req);

  const [spaces, stats] = await Promise.all([
    prisma.space.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: spaceFields,
    }),
    prisma.$queryRaw<SpaceStatsRow[]>`
      SELECT r."spaceId",
             COUNT(DISTINCT r."id")::int AS "roadmapCount",
             COUNT(DISTINCT t."id")::int AS "totalTopics",
             COUNT(DISTINCT t."id") FILTER (WHERE t."completed")::int AS "completedTopics"
      FROM "Roadmap" r
      LEFT JOIN "Unit" u ON u."roadmapId" = r."id"
      LEFT JOIN "Topic" t ON t."unitId" = u."id"
      WHERE r."userId" = ${userId}
      GROUP BY r."spaceId"`,
  ]);
  const statsById = new Map(stats.map((s) => [s.spaceId, s]));

  res.status(200).json({
    spaces: spaces.map((space) => {
      const s = statsById.get(space.id);
      const totalTopics = s?.totalTopics ?? 0;
      const completedTopics = s?.completedTopics ?? 0;
      return {
        ...space,
        roadmapCount: s?.roadmapCount ?? 0,
        progress: {
          totalTopics,
          completedTopics,
          percent: percent(completedTopics, totalTopics),
        },
      };
    }),
  });
};

// POST /api/spaces { name }
export const createSpace = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { name } = nameBodySchema.parse(req.body);

  const space = await prisma.space.create({
    data: { userId, name },
    select: spaceFields,
  });

  res.status(201).json({ space });
};

// GET /api/spaces/:spaceId: the space's roadmaps, plus the PDFs uploaded into it with every
// detected subject (roadmapId is set for subjects that already have a roadmap here)
export const getSpaceById = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { spaceId } = spaceParamsSchema.parse(req.params);
  await assertSpace(userId, spaceId);

  const [space, { roadmaps }, uploads, roadmapIdFor] = await Promise.all([
    prisma.space.findUniqueOrThrow({ where: { id: spaceId }, select: spaceFields }),
    listRoadmapSummaries({ userId, spaceId }, { limit: MAX_ROADMAPS_PER_SPACE }),
    prisma.syllabusUpload.findMany({
      where: { userId, spaceId, analysisId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        pdfHash: true,
        fileName: true,
        pageCount: true,
        createdAt: true,
        storageKey: true,
        geminiFileName: true,
        expiresAt: true,
        analysis: { select: { examOrBoard: true, subjectsJson: true } },
      },
    }),
    roadmapIdsBySubject(spaceId),
  ]);

  const totalTopics = roadmaps.reduce((n, r) => n + r.progress.totalTopics, 0);
  const completedTopics = roadmaps.reduce((n, r) => n + r.progress.completedTopics, 0);

  // The same file uploaded twice is listed once (the newest upload)
  const seenHashes = new Set<string>();
  const pdfs = uploads.filter((u) => {
    if (seenHashes.has(u.pdfHash)) return false;
    seenHashes.add(u.pdfHash);
    return true;
  });

  res.status(200).json({
    space: {
      ...space,
      roadmaps,
      progress: {
        totalTopics,
        completedTopics,
        percent: percent(completedTopics, totalTopics),
      },
      uploads: pdfs.map(({ pdfHash: _hash, analysis, storageKey, geminiFileName, expiresAt, ...upload }) => ({
        ...upload,
        examOrBoard: analysis?.examOrBoard ?? null,
        // Send to POST /syllabus/:uploadId/roadmaps while canGenerate is true
        canGenerate: canGenerateFrom({ storageKey, geminiFileName, expiresAt }),
        subjects: StoredSubjectsSchema.parse(analysis?.subjectsJson ?? []).map(
          (subject, index) => ({
            index,
            ...subject,
            roadmapId: roadmapIdFor(subject.name, subject.group),
          }),
        ),
      })),
    },
  });
};

// PATCH /api/spaces/:spaceId { name }
export const renameSpace = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { spaceId } = spaceParamsSchema.parse(req.params);
  const { name } = nameBodySchema.parse(req.body);
  await assertSpace(userId, spaceId);

  const space = await prisma.space.update({
    where: { id: spaceId },
    data: { name },
    select: spaceFields,
  });

  res.status(200).json({ message: "Space updated successfully", space });
};

// DELETE /api/spaces/:spaceId: deletes the space and every roadmap in it
export const deleteSpace = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { spaceId } = spaceParamsSchema.parse(req.params);
  await assertSpace(userId, spaceId);

  const deletedRoadmaps = await prisma.roadmap.count({ where: { spaceId } });
  await prisma.space.delete({ where: { id: spaceId } });

  res.status(200).json({ message: "Space deleted successfully", deletedRoadmaps });
};
