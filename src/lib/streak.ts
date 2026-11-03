// Pure study-time and streak logic: no database or env imports, so tests can load it
// directly. lib/studySession.ts re-exports these for the rest of the app.

// A session left running for days shouldn't count as days of study
export const MAX_SESSION_SECONDS = 12 * 60 * 60;
// A day counts toward the streak once this much was studied in it
export const STREAK_MIN_SECONDS = 60;
// Shorter sessions (e.g. started and stopped by accident) aren't saved
export const MIN_SESSION_SECONDS = 60;

type TimedSession = {
  status: string;
  activeSeconds: number;
  resumedAt: Date | null;
};

// Seconds studied so far, including the current running stretch
export function elapsedSeconds(session: TimedSession, now = new Date()) {
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
