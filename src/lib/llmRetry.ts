import { z } from "zod";
import { llmCall } from "./lllmcall.js";
import AppError from "./error/appError.js";

export async function generateStructuredResponse<T>(
  prompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  let lastError: unknown;

  try {
    const response = await llmCall(prompt, schema);
    if (!response) {
      throw new AppError("LLM returned an empty response", 502);
    }
    let json: unknown;
    try {
      json = JSON.parse(response);
    } catch (error) {
      throw new AppError("LLM response was not valid JSON", 502);
    }
    const result = schema.safeParse(json);
    if (result.success) {
      return result.data;
    }
    lastError = result.error;
  } catch (error) {
    console.error("generateStructuredResponse error:", error);
    lastError = error;
  }
  if (lastError instanceof AppError) throw lastError;
  throw new AppError(
    `Failed to generate a valid structured response ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
    502,
  );
}
