import z from "zod";
import type { DetectedStructure } from "../../validationSchema/detectedSchema.js";

// Subjects detected in a syllabus PDF, and the clean-up of the model's raw output.
// No database or API imports, so tests can load it directly.

// Shape of SyllabusAnalysis.subjectsJson
export const StoredSubjectsSchema = z.array(
  z.object({
    name: z.string(),
    group: z.string().nullable(),
    startPage: z.number().int(),
    endPage: z.number().int(),
  }),
);
export type StoredSubject = z.infer<typeof StoredSubjectsSchema>[number];

export const MAX_SUBJECTS = 200;

// The model's page numbers can be off: keep them inside the PDF and in order
export function normalizeSubjects(
  subjects: DetectedStructure["subjects"],
  pageCount: number,
): StoredSubject[] {
  const clamp = (page: number) => Math.min(Math.max(page, 1), pageCount);
  return subjects.slice(0, MAX_SUBJECTS).map((s) => {
    const a = clamp(s.startPage);
    const b = clamp(s.endPage);
    return {
      name: s.name.trim(),
      group: s.group?.trim() || null,
      startPage: Math.min(a, b),
      endPage: Math.max(a, b),
    };
  });
}
