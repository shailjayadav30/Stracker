import { describe, expect, it } from "vitest";
import { MAX_SUBJECTS, normalizeSubjects } from "../src/lib/syllabus/subjects.js";

const subject = (overrides: Partial<Parameters<typeof normalizeSubjects>[0][number]> = {}) => ({
  name: "History",
  group: null,
  startPage: 3,
  endPage: 5,
  ...overrides,
});

describe("normalizeSubjects (cleaning up the model's detected subjects)", () => {
  it("keeps valid subjects as they are", () => {
    expect(normalizeSubjects([subject()], 10)).toEqual([
      { name: "History", group: null, startPage: 3, endPage: 5 },
    ]);
  });

  it("trims names and groups", () => {
    const [s] = normalizeSubjects([subject({ name: "  History  ", group: " Paper I " })], 10);
    expect(s).toMatchObject({ name: "History", group: "Paper I" });
  });

  it("turns an empty or blank group into null", () => {
    expect(normalizeSubjects([subject({ group: "" })], 10)[0]?.group).toBeNull();
    expect(normalizeSubjects([subject({ group: "   " })], 10)[0]?.group).toBeNull();
  });

  it("swaps pages given in reverse", () => {
    expect(normalizeSubjects([subject({ startPage: 9, endPage: 4 })], 10)[0]).toMatchObject({
      startPage: 4,
      endPage: 9,
    });
  });

  it("clamps pages into the PDF", () => {
    // Model says pages 0..80 of a 50-page PDF
    expect(normalizeSubjects([subject({ startPage: 0, endPage: 80 })], 50)[0]).toMatchObject({
      startPage: 1,
      endPage: 50,
    });
    expect(normalizeSubjects([subject({ startPage: -3, endPage: -1 })], 50)[0]).toMatchObject({
      startPage: 1,
      endPage: 1,
    });
  });

  it("keeps at most MAX_SUBJECTS subjects", () => {
    const many = Array.from({ length: MAX_SUBJECTS + 25 }, (_, i) => subject({ name: `S${i}` }));
    const result = normalizeSubjects(many, 10);
    expect(result).toHaveLength(MAX_SUBJECTS);
    expect(result.at(-1)?.name).toBe(`S${MAX_SUBJECTS - 1}`);
  });

  it("returns an empty list for no subjects", () => {
    expect(normalizeSubjects([], 10)).toEqual([]);
  });
});
