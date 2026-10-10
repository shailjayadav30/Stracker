import z from "zod";

// Pass 2 (extract one subject) output for the analyze -> generate flow. Also sent to
// Gemini as the response JSON schema. Empty units means the subject wasn't found.
export const RoadmapSchemaV2 = z.object({
  name: z.string(),
  units: z.array(
    z.object({
      name: z.string().min(1),
      sourceLabel: z.string().nullable(), // "Unit", "Chapter", "Module", "Section"
      topics: z.array(
        z.object({
          name: z.string().min(1),
          subTopics: z.array(z.string().min(1)),
        }),
      ),
    }),
  ),
  warnings: z.array(z.string()), // e.g. "Some pages were unreadable"
});

export type RoadmapV2 = z.infer<typeof RoadmapSchemaV2>;

// Used by the legacy POST /uploadfile flow.
// Also sent to Gemini as the response JSON schema. The prompt asks for
// {"name": "", "units": []} when the PDF has no syllabus, so name and units may be
// empty here; the upload controller turns that case into a 422.
export const RoadmapSchema = z.object({
  name: z.string(),
  units: z.array(
    z.object({
      name: z.string().min(1),
      topics: z.array(
        z.object({
          name: z.string().min(1),
          subTopics: z.array(z.string().min(1)),
        }),
      ),
    }),
  ),
});
