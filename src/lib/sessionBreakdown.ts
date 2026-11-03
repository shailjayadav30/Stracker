// Groups what a study session completed by unit. Pure (no database), so tests can load
// it; the study-session controller looks up the units and passes them in.

export type SessionItem = { kind: "TOPIC" | "SUBTOPIC"; itemId: string; name: string };
export type UnitRef = { name: string; position: number };

export type UnitBreakdown = {
  name: string | null; // null: the topic/subtopic was deleted since
  topics: string[];
  subTopics: { name: string; topicName: string | null }[];
};

// topicUnit: topic id -> its unit; subTopicInfo: subtopic id -> its topic (and unit).
// Items missing from the maps (deleted since) keep their name under a null unit, last.
export function groupItemsByUnit(
  items: SessionItem[],
  topicUnit: ReadonlyMap<string, UnitRef>,
  subTopicInfo: ReadonlyMap<string, { name: string; unit: UnitRef }>,
): UnitBreakdown[] {
  const units = new Map<string, UnitBreakdown & { position: number }>();
  const unitFor = (unit: UnitRef | undefined) => {
    const key = unit ? `${unit.position}\u0000${unit.name}` : "";
    let entry = units.get(key);
    if (!entry) {
      entry = {
        name: unit?.name ?? null,
        position: unit?.position ?? Number.MAX_SAFE_INTEGER,
        topics: [],
        subTopics: [],
      };
      units.set(key, entry);
    }
    return entry;
  };

  for (const item of items) {
    if (item.kind === "TOPIC") {
      unitFor(topicUnit.get(item.itemId)).topics.push(item.name);
    } else {
      const topic = subTopicInfo.get(item.itemId);
      unitFor(topic?.unit).subTopics.push({ name: item.name, topicName: topic?.name ?? null });
    }
  }

  // Units in syllabus order; anything whose unit is gone goes last
  return [...units.values()]
    .sort((a, b) => a.position - b.position)
    .map(({ position: _position, ...unit }) => unit);
}
