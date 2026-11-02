import prisma from "./db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { elapsedSeconds } from "./streak.js";

// The pure time/streak logic lives in streak.ts (testable without a database)
export {
  addDays,
  computeStreak,
  elapsedSeconds,
  localDay,
  MAX_SESSION_SECONDS,
  MIN_SESSION_SECONDS,
  STREAK_MIN_SECONDS,
} from "./streak.js";

type Tx = Prisma.TransactionClient;

export const OPEN_STATUSES = ["ACTIVE", "PAUSED"] as const;

export type CompletedItem = {
  kind: "TOPIC" | "SUBTOPIC";
  itemId: string;
  name: string;
};

// Tick/untick while a session is open on the roadmap: add or remove the items from it.
// Ticks with no open session only change the roadmap, as before.
export async function logSessionItems(
  tx: Tx,
  userId: string,
  roadmapId: string,
  items: CompletedItem[],
  completed: boolean,
) {
  if (items.length === 0) return;
  const session = await tx.studySession.findFirst({
    where: { userId, roadmapId, status: { in: [...OPEN_STATUSES] } },
    select: { id: true },
  });
  if (!session) return;

  if (completed) {
    await tx.studySessionItem.createMany({
      data: items.map((item) => ({ ...item, sessionId: session.id })),
      skipDuplicates: true,
    });
  } else {
    await tx.studySessionItem.deleteMany({
      where: {
        sessionId: session.id,
        OR: items.map(({ kind, itemId }) => ({ kind, itemId })),
      },
    });
  }
}

const sessionSelect = {
  id: true,
  roadmapId: true,
  roadmapName: true,
  status: true,
  activeSeconds: true,
  resumedAt: true,
  startedAt: true,
  endedAt: true,
  endedOnDay: true,
  items: { select: { kind: true, itemId: true, name: true }, orderBy: { completedAt: "asc" } },
} as const satisfies Prisma.StudySessionSelect;

type SessionRow = Prisma.StudySessionGetPayload<{ select: typeof sessionSelect }>;

export function toApiSession(session: SessionRow, now = new Date()) {
  const { activeSeconds: _active, resumedAt: _resumed, items, ...rest } = session;
  return {
    ...rest,
    running: session.status === "ACTIVE",
    elapsedSeconds: elapsedSeconds(session, now),
    // Ids so the app can mark items ticked in this session
    topicIds: items.filter((i) => i.kind === "TOPIC").map((i) => i.itemId),
    subTopicIds: items.filter((i) => i.kind === "SUBTOPIC").map((i) => i.itemId),
    topicsCompleted: items.filter((i) => i.kind === "TOPIC").length,
    subTopicsCompleted: items.filter((i) => i.kind === "SUBTOPIC").length,
  };
}

export function findOpenSession(userId: string) {
  return prisma.studySession.findFirst({
    where: { userId, status: { in: [...OPEN_STATUSES] } },
    orderBy: { startedAt: "desc" },
    select: sessionSelect,
  });
}

export function getSession(userId: string, sessionId: string) {
  return prisma.studySession.findFirst({
    where: { id: sessionId, userId },
    select: sessionSelect,
  });
}

export { sessionSelect };
