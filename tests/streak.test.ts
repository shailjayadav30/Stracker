import { describe, expect, it } from "vitest";
import {
  addDays,
  computeStreak,
  elapsedSeconds,
  localDay,
  MAX_SESSION_SECONDS,
} from "../src/lib/streak.js";

describe("addDays", () => {
  it("moves forward and back within a month", () => {
    expect(addDays("2026-10-12", 1)).toBe("2026-10-13");
    expect(addDays("2026-10-12", -1)).toBe("2026-10-11");
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("handles leap years", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });

  it("returns the same day for 0", () => {
    expect(addDays("2026-10-12", 0)).toBe("2026-10-12");
  });
});

describe("localDay", () => {
  it("uses the user's time zone, not UTC", () => {
    // 18:00 UTC is 23:30 in India: still the same day there
    expect(localDay(new Date("2026-10-12T18:00:00Z"), "Asia/Kolkata")).toBe("2026-10-12");
    // 18:30 UTC is 00:00 in India: already the next day there
    expect(localDay(new Date("2026-10-12T18:30:00Z"), "Asia/Kolkata")).toBe("2026-10-13");
  });

  it("can be behind UTC too", () => {
    // 03:00 UTC is still the previous evening in New York
    expect(localDay(new Date("2026-10-13T03:00:00Z"), "America/New_York")).toBe("2026-10-12");
  });

  it("crosses the year in local time", () => {
    // 31 Dec 20:00 UTC is already 1 Jan in India
    expect(localDay(new Date("2026-12-31T20:00:00Z"), "Asia/Kolkata")).toBe("2027-01-01");
  });

  it("falls back to UTC for an unknown time zone instead of throwing", () => {
    expect(localDay(new Date("2026-10-12T23:00:00Z"), "Not/AZone")).toBe("2026-10-12");
  });
});

describe("computeStreak", () => {
  const today = "2026-10-12";

  it("is zero with no study", () => {
    expect(computeStreak([], today)).toEqual({ current: 0, longest: 0, studiedToday: false });
  });

  it("counts today", () => {
    expect(computeStreak(["2026-10-12"], today)).toEqual({
      current: 1,
      longest: 1,
      studiedToday: true,
    });
  });

  it("keeps yesterday's streak alive until today ends", () => {
    expect(computeStreak(["2026-10-10", "2026-10-11"], today)).toEqual({
      current: 2,
      longest: 2,
      studiedToday: false,
    });
  });

  it("breaks when a whole day was missed", () => {
    // Studied on the 10th, nothing on the 11th
    expect(computeStreak(["2026-10-09", "2026-10-10"], today)).toMatchObject({
      current: 0,
      longest: 2,
    });
  });

  it("counts back from today across the gap only", () => {
    // 12th, 11th, (no 10th), 9th
    expect(computeStreak(["2026-10-09", "2026-10-11", "2026-10-12"], today)).toMatchObject({
      current: 2,
      longest: 2,
    });
  });

  it("reports the longest run even when it's in the past", () => {
    const days = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"];
    expect(computeStreak([...days, "2026-10-12"], today)).toMatchObject({
      current: 1,
      longest: 5,
    });
  });

  it("continues across month and year boundaries", () => {
    expect(computeStreak(["2026-09-30", "2026-10-01"], "2026-10-01").current).toBe(2);
    expect(computeStreak(["2025-12-31", "2026-01-01"], "2026-01-01").current).toBe(2);
  });

  it("continues across a leap day", () => {
    expect(computeStreak(["2028-02-28", "2028-02-29", "2028-03-01"], "2028-03-01").current).toBe(3);
  });

  it("ignores duplicates and input order", () => {
    expect(
      computeStreak(["2026-10-12", "2026-10-11", "2026-10-12", "2026-10-11"], today),
    ).toEqual({ current: 2, longest: 2, studiedToday: true });
  });
});

describe("elapsedSeconds", () => {
  const now = new Date("2026-10-12T10:00:00Z");
  const secondsAgo = (s: number) => new Date(now.getTime() - s * 1000);

  it("returns the saved time while paused", () => {
    expect(elapsedSeconds({ status: "PAUSED", activeSeconds: 300, resumedAt: null }, now)).toBe(300);
  });

  it("adds the current running stretch while running", () => {
    expect(
      elapsedSeconds({ status: "ACTIVE", activeSeconds: 300, resumedAt: secondsAgo(90) }, now),
    ).toBe(390);
  });

  it("ignores resumedAt when the session isn't running", () => {
    expect(
      elapsedSeconds({ status: "COMPLETED", activeSeconds: 120, resumedAt: secondsAgo(500) }, now),
    ).toBe(120);
  });

  it("never goes negative if resumedAt is ahead of now (clock skew)", () => {
    const future = new Date(now.getTime() + 60_000);
    expect(elapsedSeconds({ status: "ACTIVE", activeSeconds: 10, resumedAt: future }, now)).toBe(10);
  });

  it("caps a forgotten session at 12 hours", () => {
    expect(
      elapsedSeconds({ status: "ACTIVE", activeSeconds: 0, resumedAt: secondsAgo(3 * 86400) }, now),
    ).toBe(MAX_SESSION_SECONDS);
  });
});
