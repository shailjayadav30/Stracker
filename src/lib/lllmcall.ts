import { ai } from "./agent.js";
import {z} from "zod"
import { SyllabusSchema } from "../validationSchema/roadmapSchema.js";
export async function llmCall(pdfContent: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: pdfContent,
    config:{
        responseMimeType:"application/json",
        responseJsonSchema:z.toJSONSchema(SyllabusSchema)
    }
  });
  if (!response.text) {
    throw new Error("cannot generate");
  }
  return response.text;
}
