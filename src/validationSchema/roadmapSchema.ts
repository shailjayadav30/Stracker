import z from "zod";

export const RoadmapSchema = z.object({
  name:z.string(),
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
});
