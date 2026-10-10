import z from "zod";
import { GENERATE_LIMITS } from "../config/syllabus.js";

export const roadmapParamsSchema = z.object({ roadmapId: z.uuid() });
export const unitParamsSchema = z.object({ unitId: z.uuid() });
export const topicParamsSchema = z.object({ topicId: z.uuid() });
export const subTopicParamsSchema = z.object({ subTopicId: z.uuid() });

// ?limit=&cursor= for list endpoints; cursor is the last id of the previous page
export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.uuid().optional(),
});

export const nameBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
});

export const completeBodySchema = z.object({ completed: z.boolean() });

export const followBodySchema = z.object({ isFollowing: z.boolean() });

export const studySessionBodySchema = z.object({
  roadmapId: z.uuid(),
  unitId: z.uuid(),
  plannedDuration: z.number().int().positive(),
  startedAt: z.coerce.date(),
});

export const uploadParamsSchema = z.object({ uploadId: z.uuid() });
export const examGroupParamsSchema = z.object({ examGroupId: z.uuid() });

// Either pick subjects from the analysis (by their index), or name one that wasn't detected
export const generateBodySchema = z.union([
  z.object({
    subjectIndexes: z
      .array(z.number().int().min(0))
      .min(1)
      .max(GENERATE_LIMITS.maxSubjectsPerRequest),
  }),
  z.object({
    custom: z.object({
      name: z.string().trim().min(1).max(200),
      startPage: z.number().int().min(1).optional(),
      endPage: z.number().int().min(1).optional(),
    }),
  }),
]);
export type GenerateBody = z.infer<typeof generateBodySchema>;

export const deleteExamGroupQuerySchema = z.object({
  // true: delete the group's roadmaps too; false: keep them as ungrouped roadmaps
  deleteRoadmaps: z.stringbool().default(false),
});
