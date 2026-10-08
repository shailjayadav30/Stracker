import { ai } from "./agent.js";
import { env } from "./env.js";
import { z } from "zod";

const LLM_TIMEOUT_MS = 120_000;

export async function llmCall<T>(prompt: string, schema: z.ZodType<T>) {
  console.log("Calling Gemini, prompt characters:", prompt.length);
  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(schema),
      abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    },
  });
  if (!response.text) {
    throw new Error("Gemini returned empty response");
  }
  console.log("Gemini response characters:", response.text.length);
  return response.text;
}
