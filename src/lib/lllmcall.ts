import { ai } from "./agent.js";
import { z } from "zod";
export async function llmCall<T>(prompt: string, schema: z.ZodType<T>) {
  try {
    console.log("Calling Gemini...");
    console.log("Prompt characters:", prompt.length);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(schema),
      },
    });
    console.log("Gemini response received");
    console.log("Response length:", response.text?.length);
    if (!response.text) {
      throw new Error("Gemini returned empty response");
    }

    return response.text;
  } catch (error) {
    console.error("========== GEMINI ERROR ==========");
    console.error(error);
    console.error("==================================");

    throw error;
  }
}
