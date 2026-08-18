import { ai } from "./agent.js";


export async function llmCall(pdfContent: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: pdfContent,
  });
  if (!response.text) {
    throw new Error("cannot generate");
  }
  return response.text;
}
