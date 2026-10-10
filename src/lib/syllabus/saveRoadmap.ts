import prisma from "../db.js";
import { roadmapTree } from "../roadmapTree.js";
import type { DocumentType } from "../../generated/prisma/client.js";

type RoadmapContent = {
  name: string;
  units: {
    name: string;
    sourceLabel?: string | null;
    topics: { name: string; subTopics: string[] }[];
  }[];
};

type RoadmapMeta = {
  userId: string;
  documentType?: DocumentType | null;
  examOrBoard?: string | null;
  subjectGroup?: string | null;
  examGroupId?: string | null;
  promptVersion?: string | null;
};

// Save an extracted roadmap; position keeps the syllabus order from the AI output
export function saveRoadmap(content: RoadmapContent, meta: RoadmapMeta) {
  return prisma.roadmap.create({
    data: {
      name: content.name,
      userId: meta.userId,
      documentType: meta.documentType ?? null,
      examOrBoard: meta.examOrBoard ?? null,
      subjectGroup: meta.subjectGroup ?? null,
      examGroupId: meta.examGroupId ?? null,
      promptVersion: meta.promptVersion ?? null,
      units: {
        create: content.units.map((unit, unitIndex) => ({
          name: unit.name,
          sourceLabel: unit.sourceLabel ?? null,
          position: unitIndex,
          topics: {
            create: unit.topics.map((topic, topicIndex) => ({
              name: topic.name,
              position: topicIndex,
              subTopics: {
                create: topic.subTopics.map((subTopic, subTopicIndex) => ({
                  name: subTopic,
                  position: subTopicIndex,
                })),
              },
            })),
          },
        })),
      },
    },
    include: roadmapTree,
  });
}
