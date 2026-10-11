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

export const profileBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Name is too long"),
});

export const completeBodySchema = z.object({ completed: z.boolean() });

export const followBodySchema = z.object({ isFollowing: z.boolean() });

export const sessionParamsSchema = z.object({ sessionId: z.uuid() });
export const startSessionBodySchema = z.object({ roadmapId: z.uuid() });

// IANA zone from the device ("Asia/Kolkata"); days for stats and streaks are counted in it
const timeZone = z.string().trim().min(1).max(64).default("UTC");
export const endSessionBodySchema = z.object({ timeZone });
export const progressQuerySchema = z.object({
  timeZone,
  days: z.coerce.number().int().min(1).max(90).default(7),
});

export const uploadParamsSchema = z.object({ uploadId: z.uuid() });
export const spaceParamsSchema = z.object({ spaceId: z.uuid() });

// Multipart field sent with the PDF to POST /syllabus/analyze
export const analyzeBodySchema = z.object({ spaceId: z.uuid() });

// Legacy POST /uploadfile: without a space the roadmap goes to "My roadmaps"
export const uploadFileBodySchema = z.object({ spaceId: z.uuid().optional() });

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
