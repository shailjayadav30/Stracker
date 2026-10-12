import prisma from "./db.js";
import type { Prisma, StudySession } from "../generated/prisma/client.js";

type Tx = Prisma.TransactionClient;

// A session left running for days shouldn't count as days of study
export const MAX_SESSION_SECONDS = 12 * 60 * 60;
// A day counts toward the streak once this much was studied in it
export const STREAK_MIN_SECONDS = 60;
// Shorter sessions (e.g. started and stopped by accident) aren't saved
export const MIN_SESSION_SECONDS = 60;

export const OPEN_STATUSES = ["ACTIVE", "PAUSED"] as const;

// Seconds studied so far, including the current running stretch
export function elapsedSeconds(
  session: Pick<StudySession, "status" | "activeSeconds" | "resumedAt">,
  now = new Date(),
) {
  const running =
    session.status === "ACTIVE" && session.resumedAt
      ? Math.max(0, Math.floor((now.getTime() - session.resumedAt.getTime()) / 1000))
      : 0;
  return Math.min(session.activeSeconds + running, MAX_SESSION_SECONDS);
}

// "2026-10-12" in the user's time zone (falls back to UTC for an unknown zone)
export function localDay(date: Date, timeZone: string) {
  const format = (zone: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  try {
    return format(timeZone);
  } catch {
    return format("UTC");
  }
}

// Calendar arithmetic on "YYYY-MM-DD" strings
export function addDays(day: string, delta: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

// Current and longest run of consecutive study days. The current streak survives until a
// whole day passes without study: it counts back from today, or from yesterday if today
// has no study yet.
export function computeStreak(studyDays: Iterable<string>, today: string) {
  const days = new Set(studyDays);
  const sorted = [...days].sort();

  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  const studiedToday = days.has(today);
  let current = 0;
  let cursor = studiedToday ? today : addDays(today, -1);
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest, studiedToday };
}

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
