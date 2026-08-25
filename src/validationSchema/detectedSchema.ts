import z from "zod";

const StructureNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.enum([
      "exam",
      "paper",
      "subject",
      "section",
      "unit",
      "module",
      "chapter",
      "topic",
      "subtopic",
      "unknown",
    ]),
    children: z.array(StructureNodeSchema),
  }),
);

export const DocumentStructureSchema = z.object({
  documentTitle: z.string,
  structure: z.array(StructureNodeSchema),
});
