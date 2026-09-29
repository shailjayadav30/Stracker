import z from "zod";

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
      ).min(1),
    }),
  ).min(1),
});
