import prisma from "./db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { toApiDocumentType } from "./syllabus/documentType.js";

type ProgressRow = {
  roadmapId: string;
  totalTopics: number;
  completedTopics: number;
  totalSubTopics: number;
  completedSubTopics: number;
};

// One page of roadmaps for list screens: summary fields plus progress counts, without
// the unit/topic/subtopic tree (getRoadmapById returns that).
export async function listRoadmapSummaries(
  where: Prisma.RoadmapWhereInput,
  { limit, cursor }: { limit: number; cursor?: string | undefined },
) {
  // Fetch one extra row to know whether another page exists
  const rows = await prisma.roadmap.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: {
      id: true,
      name: true,
      isFollowing: true,
      documentType: true,
      examOrBoard: true,
      subjectGroup: true,
      examGroupId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { units: true } },
    },
  });
  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? (page.at(-1)?.id ?? null) : null;

  // Topic/subtopic counts for the whole page in a single query
  const ids = page.map((r) => r.id);
  const progressRows = ids.length
    ? await prisma.$queryRaw<ProgressRow[]>`
        SELECT u."roadmapId",
               COUNT(DISTINCT t."id")::int AS "totalTopics",
               COUNT(DISTINCT t."id") FILTER (WHERE t."completed")::int AS "completedTopics",
               COUNT(s."id")::int AS "totalSubTopics",
               COUNT(s."id") FILTER (WHERE s."completed")::int AS "completedSubTopics"
        FROM "Unit" u
        JOIN "Topic" t ON t."unitId" = u."id"
        LEFT JOIN "SubTopic" s ON s."topicId" = t."id"
        WHERE u."roadmapId" = ANY(${ids})
        GROUP BY u."roadmapId"`
    : [];
  const progressById = new Map(progressRows.map((p) => [p.roadmapId, p]));

  const roadmaps = page.map(({ _count, documentType, ...roadmap }) => {
    const p = progressById.get(roadmap.id);
    const totalTopics = p?.totalTopics ?? 0;
    const completedTopics = p?.completedTopics ?? 0;
    return {
      ...roadmap,
      documentType: toApiDocumentType(documentType),
      unitCount: _count.units,
      progress: {
        totalTopics,
        completedTopics,
        totalSubTopics: p?.totalSubTopics ?? 0,
        completedSubTopics: p?.completedSubTopics ?? 0,
        // Topics are the unit of completion today (completeTopic/completeUnit)
        percent: totalTopics
          ? Math.round((completedTopics / totalTopics) * 100)
          : 0,
      },
    };
  });

  return { roadmaps, nextCursor };
}
