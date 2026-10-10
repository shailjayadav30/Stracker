import { FinishReason, createPartFromUri } from "@google/genai";
import { ai } from "./agent.js";
import { env } from "./env.js";
import { z } from "zod";
import type { GeminiFileRef } from "./geminiFiles.js";

const LLM_TIMEOUT_MS = 120_000;

export type LlmCallOptions = {
  // PDF uploaded to the Gemini Files API; sent before the instructions
  file?: GeminiFileRef | undefined;
  model?: string | undefined;
};

// The model hit its output token limit, so the JSON is incomplete. Retrying the same
// request would hit the same limit, so this is not retried.
export class LlmOutputTruncatedError extends Error {}

export async function llmCall<T>(
  prompt: string,
  schema: z.ZodType<T>,
  { file, model = env.GEMINI_MODEL }: LlmCallOptions = {},
) {
  const startedAt = Date.now();
  const response = await ai.models.generateContent({
    model,
    contents: file
      ? [createPartFromUri(file.uri, file.mimeType), { text: prompt }]
      : prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(schema),
      abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    },
  });

  // Log sizes and timing only, never document content
  const usage = response.usageMetadata;
  console.log(
    `Gemini ${model}: ${Date.now() - startedAt}ms, input tokens ${usage?.promptTokenCount ?? "?"}, output tokens ${usage?.candidatesTokenCount ?? "?"}`,
  );

  if (response.candidates?.[0]?.finishReason === FinishReason.MAX_TOKENS) {
    throw new LlmOutputTruncatedError(
      "The syllabus is too long for one response; try a PDF with fewer pages",
    );
  }
  if (!response.text) {
    throw new Error("Gemini returned empty response");
  }
  return response.text;
}
