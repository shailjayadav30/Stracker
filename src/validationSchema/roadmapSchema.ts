import z from "zod";

export const SyllabusSchema = z.object({
  subjects: z.array(
    z.object({
      name: z.string(),
      units: z.array(
        z.object({
          name: z.string(),
          topics: z.array(
            z.object({
              name: z.string(),
              subTopics: z.array(z.string()),
            }),
          ),
        }),
      ),
    }),
  ),
});
