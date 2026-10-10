import z from "zod";

export const DOCUMENT_TYPES = [
  "school",
  "college",
  "competitive_exam",
  "professional",
  "other",
] as const;

// Pass 1 (subject detection) output. Also sent to Gemini as the response JSON schema,
// so only required/nullable fields (no .optional()). Page numbers are clamped server-side.
export const DetectedStructureSchema = z.object({
  isSyllabus: z.boolean(),
  documentType: z.enum(DOCUMENT_TYPES),
  examOrBoard: z.string().nullable(), // "CBSE Class 10", "JEE Main 2026", "B.Tech CSE Sem 3"
  language: z.string(), // "en", "hi", ...
  subjects: z.array(
    z.object({
      name: z.string().min(1),
      group: z.string().nullable(), // "Semester 3", "Paper I", "Prelims", "Class 12"
      startPage: z.number().int(), // 1-based, from the detailed syllabus body
      endPage: z.number().int(),
    }),
  ),
});

export type DetectedStructure = z.infer<typeof DetectedStructureSchema>;
