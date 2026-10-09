import z from "zod";

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
