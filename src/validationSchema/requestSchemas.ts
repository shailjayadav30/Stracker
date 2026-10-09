import z from "zod";

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
