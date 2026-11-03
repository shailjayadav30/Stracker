import { describe, expect, it } from "vitest";
import { groupItemsByUnit, type SessionItem } from "../src/lib/sessionBreakdown.js";

const unit1 = { name: "Unit 1: Ancient", position: 0 };
const unit2 = { name: "Unit 2: Modern", position: 1 };

const topicUnit = new Map([
  ["t-vedic", unit1],
  ["t-1857", unit2],
]);
const subTopicInfo = new Map([
  ["s-causes", { name: "Revolt of 1857", unit: unit2 }],
  ["s-rigveda", { name: "Vedic age", unit: unit1 }],
]);

const topic = (itemId: string, name: string): SessionItem => ({ kind: "TOPIC", itemId, name });
const sub = (itemId: string, name: string): SessionItem => ({ kind: "SUBTOPIC", itemId, name });

describe("groupItemsByUnit (recent session details)", () => {
  it("groups topics and subtopics under their unit, in syllabus order", () => {
    const result = groupItemsByUnit(
      [topic("t-1857", "Revolt of 1857"), sub("s-rigveda", "Rigveda"), topic("t-vedic", "Vedic age")],
      topicUnit,
      subTopicInfo,
    );
    expect(result).toEqual([
      {
        name: "Unit 1: Ancient",
        topics: ["Vedic age"],
        subTopics: [{ name: "Rigveda", topicName: "Vedic age" }],
      },
      { name: "Unit 2: Modern", topics: ["Revolt of 1857"], subTopics: [] },
    ]);
  });

  it("shows each subtopic's topic", () => {
    const [unit] = groupItemsByUnit([sub("s-causes", "Causes")], topicUnit, subTopicInfo);
    expect(unit?.subTopics).toEqual([{ name: "Causes", topicName: "Revolt of 1857" }]);
  });

  it("puts items deleted since under a null unit, last, keeping their names", () => {
    const result = groupItemsByUnit(
      [topic("t-gone", "Deleted topic"), sub("s-gone", "Deleted sub"), topic("t-vedic", "Vedic age")],
      topicUnit,
      subTopicInfo,
    );
    expect(result.map((u) => u.name)).toEqual(["Unit 1: Ancient", null]);
    expect(result[1]).toEqual({
      name: null,
      topics: ["Deleted topic"],
      subTopics: [{ name: "Deleted sub", topicName: null }],
    });
  });

  it("returns nothing for a session where nothing was ticked", () => {
    expect(groupItemsByUnit([], topicUnit, subTopicInfo)).toEqual([]);
  });
});
