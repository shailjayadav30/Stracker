import prisma from "./db.js";
import AppError from "./error/appError.js";

// Space for roadmaps created without one (the legacy single-PDF upload)
export const DEFAULT_SPACE_NAME = "My roadmaps";

// The user's space, or 404 (also for someone else's space)
export async function assertSpace(userId: string, spaceId: string) {
  const space = await prisma.space.findFirst({
    where: { id: spaceId, userId },
    select: { id: true, name: true },
  });
  if (!space) {
    throw new AppError("Space not found", 404);
  }
  return space;
}

export async function getDefaultSpaceId(userId: string) {
  const existing = await prisma.space.findFirst({
    where: { userId, name: DEFAULT_SPACE_NAME },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.space.create({
    data: { userId, name: DEFAULT_SPACE_NAME },
    select: { id: true },
  });
  return created.id;
}

// Generated roadmaps keep the subject's name and group, so a subject is "created" in a
// space when one of its roadmaps has both (two subjects can share a name, e.g.
// "General Studies" in Paper I and Paper II)
const subjectKey = (name: string, group: string | null) =>
  `${name}\u0000${group ?? ""}`;

export async function roadmapIdsBySubject(spaceId: string) {
  const roadmaps = await prisma.roadmap.findMany({
    where: { spaceId },
    select: { id: true, name: true, subjectGroup: true },
  });
  const byKey = new Map(roadmaps.map((r) => [subjectKey(r.name, r.subjectGroup), r.id]));
  return (name: string, group: string | null) => byKey.get(subjectKey(name, group)) ?? null;
}
