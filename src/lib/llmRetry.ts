import { z } from "zod";
import { ApiError } from "@google/genai";
import { llmCall, LlmOutputTruncatedError } from "./llmCall.js";
import type { LlmCallOptions } from "./llmCall.js";
import AppError from "./error/appError.js";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1_000;

class InvalidLlmOutputError extends Error {}

// Retry rate limits, server errors, timeouts/network failures and malformed JSON.
// Other 4xx API errors and schema mismatches are not retried (they won't fix themselves and cost money).
function isRetryable(error: unknown) {
  if (error instanceof InvalidLlmOutputError) return true;
  if (error instanceof LlmOutputTruncatedError) return false;
  if (error instanceof ApiError) return error.status === 429 || error.status >= 500;
  return true;
}

export async function generateStructuredResponse<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options: LlmCallOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await llmCall(prompt, schema, options);
      let json: unknown;
      try {
        json = JSON.parse(response);
      } catch {
        throw new InvalidLlmOutputError("LLM response was not valid JSON");
      }
      const result = schema.safeParse(json);
      if (result.success) {
        return result.data;
      }
      lastError = result.error;
      break;
    } catch (error) {
      lastError = error;
      console.error(`LLM attempt ${attempt}/${MAX_ATTEMPTS} failed:`, error);
      if (attempt === MAX_ATTEMPTS || !isRetryable(error)) break;
      await new Promise((r) => setTimeout(r, BASE_DELAY_MS * 2 ** (attempt - 1)));
    }
  }

  if (lastError instanceof LlmOutputTruncatedError) {
    throw new AppError(lastError.message, 422);
  }
  throw new AppError(
    `Failed to generate a valid structured response: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
    502,
  );
}
