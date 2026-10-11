import type { Request, Response } from "express";
import AppError from "../lib/error/appError.js";
import prisma from "../lib/db.js";
import { getUserId } from "../middleware/authmiddleware.js";
import {
  addDays,
  computeStreak,
  elapsedSeconds,
  findOpenSession,
  getSession,
  localDay,
  OPEN_STATUSES,
  sessionSelect,
  STREAK_MIN_SECONDS,
  toApiSession,
} from "../lib/studySession.js";
import {
  endSessionBodySchema,
  progressQuerySchema,
  sessionParamsSchema,
  startSessionBodySchema,
} from "../validationSchema/requestSchemas.js";

async function ownSession(req: Request) {
  const userId = getUserId(req);
  const { sessionId } = sessionParamsSchema.parse(req.params);
  const session = await getSession(userId, sessionId);
  if (!session) throw new AppError("Study session not found", 404);
  return { userId, session };
}

const notOpen = () => new AppError("This study session has already ended", 409);

// GET /api/study-sessions/active: the open (running or paused) session, or null
export const getActiveSession = async (req: Request, res: Response) => {
  const session = await findOpenSession(getUserId(req));
  res.status(200).json({ session: session ? toApiSession(session) : null });
};

// POST /api/study-sessions { roadmapId }: start the stopwatch. One open session at a time.
export const startSession = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { roadmapId } = startSessionBodySchema.parse(req.body);

  const roadmap = await prisma.roadmap.findFirst({
    where: { id: roadmapId, userId },
    select: { name: true },
  });
  if (!roadmap) throw new AppError("Roadmap not found", 404);

  const open = await findOpenSession(userId);
  if (open) {
    throw new AppError(
      open.roadmapId === roadmapId
        ? "You're already studying this subject"
        : `You're studying ${open.roadmapName}. End that session first.`,
      409,
    );
  }

  const now = new Date();
  const session = await prisma.studySession.create({
    data: {
      userId,
      roadmapId,
      roadmapName: roadmap.name,
      status: "ACTIVE",
      startedAt: now,
      resumedAt: now,
    },
    select: sessionSelect,
  });

  res.status(201).json({ session: toApiSession(session, now) });
};

// POST /api/study-sessions/:sessionId/pause
export const pauseSession = async (req: Request, res: Response) => {
  const { session } = await ownSession(req);
  if (session.status === "PAUSED") {
    res.status(200).json({ session: toApiSession(session) });
    return;
  }
  if (session.status !== "ACTIVE") throw notOpen();

  const now = new Date();
  const updated = await prisma.studySession.update({
    where: { id: session.id },
    data: { status: "PAUSED", activeSeconds: elapsedSeconds(session, now), resumedAt: null },
    select: sessionSelect,
  });
  res.status(200).json({ session: toApiSession(updated, now) });
};

// POST /api/study-sessions/:sessionId/resume
export const resumeSession = async (req: Request, res: Response) => {
  const { session } = await ownSession(req);
  if (session.status === "ACTIVE") {
    res.status(200).json({ session: toApiSession(session) });
    return;
  }
  if (session.status !== "PAUSED") throw notOpen();

  const now = new Date();
  const updated = await prisma.studySession.update({
    where: { id: session.id },
    data: { status: "ACTIVE", resumedAt: now },
    select: sessionSelect,
  });
  res.status(200).json({ session: toApiSession(updated, now) });
};

// POST /api/study-sessions/:sessionId/end { timeZone }: stop the stopwatch and save the
// session to the user's progress. Returns its summary and the updated streak.
export const endSession = async (req: Request, res: Response) => {
  const { userId, session } = await ownSession(req);
  if (!OPEN_STATUSES.includes(session.status as (typeof OPEN_STATUSES)[number])) {
    throw notOpen();
  }
  const { timeZone } = endSessionBodySchema.parse(req.body ?? {});

  const now = new Date();
  const today = localDay(now, timeZone);
  const updated = await prisma.studySession.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      activeSeconds: elapsedSeconds(session, now),
      resumedAt: null,
      endedAt: now,
      endedOnDay: today,
    },
    select: sessionSelect,
  });

  const studyDays = await getStudyDays(userId);
  const streak = computeStreak(studyDays.keys(), today);

  res.status(200).json({
    session: toApiSession(updated, now),
    // Whether this session made today count (the streak needs STREAK_MIN_SECONDS a day)
    countsTowardStreak: streak.studiedToday,
    streak,
  });
};

// DELETE /api/study-sessions/:sessionId: discard an open session (its ticks stay on the roadmap)
export const discardSession = async (req: Request, res: Response) => {
  const { session } = await ownSession(req);
  if (session.status === "COMPLETED") {
    throw new AppError("Finished sessions can't be discarded", 409);
  }
  await prisma.studySession.delete({ where: { id: session.id } });
  res.status(200).json({ message: "Study session discarded" });
};

type DayRow = { day: string; seconds: number; sessions: number };
type DayItemRow = { day: string; kind: "TOPIC" | "SUBTOPIC"; count: number };

// Seconds studied per local day, for days with enough study to count toward the streak
async function getStudyDays(userId: string) {
  const rows = await prisma.$queryRaw<DayRow[]>`
    SELECT "endedOnDay" AS day,
           SUM("activeSeconds")::int AS seconds,
           COUNT(*)::int AS sessions
    FROM "StudySession"
    WHERE "userId" = ${userId} AND status = 'COMPLETED' AND "endedOnDay" IS NOT NULL
    GROUP BY "endedOnDay"`;
  return new Map(
    rows.filter((r) => r.seconds >= STREAK_MIN_SECONDS).map((r) => [r.day, r]),
  );
}

// GET /api/progress?timeZone=&days=7: today's totals, the last `days` days (oldest first),
// streak, and recent sessions
export const getProgress = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { timeZone, days } = progressQuerySchema.parse(req.query);

  const now = new Date();
  const today = localDay(now, timeZone);
  const from = addDays(today, -(days - 1));

  const [dayRows, itemRows, recent, studyDays] = await Promise.all([
    prisma.$queryRaw<DayRow[]>`
      SELECT "endedOnDay" AS day,
             SUM("activeSeconds")::int AS seconds,
             COUNT(*)::int AS sessions
      FROM "StudySession"
      WHERE "userId" = ${userId} AND status = 'COMPLETED'
        AND "endedOnDay" >= ${from} AND "endedOnDay" <= ${today}
      GROUP BY "endedOnDay"`,
    prisma.$queryRaw<DayItemRow[]>`
      SELECT s."endedOnDay" AS day, i.kind, COUNT(*)::int AS count
      FROM "StudySessionItem" i
      JOIN "StudySession" s ON s.id = i."sessionId"
      WHERE s."userId" = ${userId} AND s.status = 'COMPLETED'
        AND s."endedOnDay" >= ${from} AND s."endedOnDay" <= ${today}
      GROUP BY s."endedOnDay", i.kind`,
    prisma.studySession.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { endedAt: "desc" },
      take: 20,
      select: sessionSelect,
    }),
    getStudyDays(userId),
  ]);

  const byDay = new Map(dayRows.map((r) => [r.day, r]));
  const itemCount = (day: string, kind: DayItemRow["kind"]) =>
    itemRows.find((r) => r.day === day && r.kind === kind)?.count ?? 0;

  const series = Array.from({ length: days }, (_, i) => {
    const day = addDays(from, i);
    return {
      day,
      seconds: byDay.get(day)?.seconds ?? 0,
      sessions: byDay.get(day)?.sessions ?? 0,
      topics: itemCount(day, "TOPIC"),
      subTopics: itemCount(day, "SUBTOPIC"),
    };
  });

  res.status(200).json({
    today: series.at(-1),
    days: series,
    streak: computeStreak(studyDays.keys(), today),
    // Every day with enough study, for a calendar view
    studyDays: [...studyDays.keys()].sort(),
    recentSessions: recent.map((s) => {
      const { topicIds: _t, subTopicIds: _s, running: _r, ...session } = toApiSession(s, now);
      return session;
    }),
  });
};
