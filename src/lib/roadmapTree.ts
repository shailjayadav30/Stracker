import type { Prisma } from "../generated/prisma/client.js";

// Full roadmap tree in syllabus order. `position` is set from the extracted order on
// upload; createdAt/id only break ties (rows from one nested create share createdAt).
const inOrder = [
  { position: "asc" },
  { createdAt: "asc" },
  { id: "asc" },
] as const;

export const roadmapTree = {
  units: {
    orderBy: [...inOrder],
    include: {
      topics: {
        orderBy: [...inOrder],
        include: {
          subTopics: { orderBy: [...inOrder] },
        },
      },
    },
  },
} satisfies Prisma.RoadmapInclude;
