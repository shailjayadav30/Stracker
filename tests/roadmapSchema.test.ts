import { describe, expect, it } from "vitest";
import { RoadmapSchemaV2 } from "../src/validationSchema/roadmapSchema.js";

// The shape the AI must return for one subject (generate step)
const valid = {
  name: "History",
  units: [
    {
      name: "Unit 1",
      sourceLabel: "Unit",
      topics: [{ name: "Vedic age", subTopics: ["Rigveda", "Later Vedic"] }],
    },
  ],
  warnings: [],
};

describe("RoadmapSchemaV2 (AI output for one subject)", () => {
  it("accepts a well-formed roadmap", () => {
    expect(RoadmapSchemaV2.safeParse(valid).success).toBe(true);
  });

  it("accepts an empty roadmap (subject not found in the PDF)", () => {
    expect(RoadmapSchemaV2.safeParse({ name: "", units: [], warnings: [] }).success).toBe(true);
  });

  it("rejects a unit without a name", () => {
    const bad = { ...valid, units: [{ ...valid.units[0], name: "" }] };
    expect(RoadmapSchemaV2.safeParse(bad).success).toBe(false);
  });

  // Current behaviour: one blank subtopic rejects the whole subject's output. Locked in
  // here so a change to it is deliberate (it could instead be dropped and the rest kept).
  it("currently rejects the whole output when one subtopic is blank", () => {
    const bad = {
      ...valid,
      units: [{ ...valid.units[0], topics: [{ name: "Vedic age", subTopics: ["Rigveda", ""] }] }],
    };
    expect(RoadmapSchemaV2.safeParse(bad).success).toBe(false);
  });
});
