import { FileState } from "@google/genai";
import { ai } from "./agent.js";
import AppError from "./error/appError.js";
import { UPLOAD_LIMITS } from "../config/syllabus.js";

export type GeminiFileRef = { name: string; uri: string; mimeType: string };

const PROCESSING_TIMEOUT_MS = 30_000;

// Upload a PDF to the Gemini Files API so both passes (and later generate requests)
// can reference it without re-sending the bytes. Gemini deletes it after ~48h.
export async function uploadPdfToGemini(pdf: Buffer, displayName: string) {
  let file = await ai.files.upload({
    file: new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
    config: { mimeType: "application/pdf", displayName },
  });

  // PDFs are usually ACTIVE right away; wait briefly if Gemini is still processing
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;
  while (file.state === FileState.PROCESSING && file.name && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1_000));
    file = await ai.files.get({ name: file.name });
  }
  if (file.state !== FileState.ACTIVE || !file.name || !file.uri) {
    throw new AppError("Could not prepare the PDF for analysis, please try again", 502);
  }

  const retentionEnd = Date.now() + UPLOAD_LIMITS.retentionHours * 3_600_000;
  const geminiExpiry = file.expirationTime ? Date.parse(file.expirationTime) : NaN;
  const expiresAt = new Date(
    Number.isNaN(geminiExpiry) ? retentionEnd : Math.min(geminiExpiry, retentionEnd),
  );

  const ref: GeminiFileRef = {
    name: file.name,
    uri: file.uri,
    mimeType: "application/pdf",
  };
  return { ref, expiresAt };
}

// Best effort: Gemini also expires files on its own
export async function deleteGeminiFile(name: string) {
  try {
    await ai.files.delete({ name });
  } catch (error) {
    console.error("Failed to delete Gemini file", name, error);
  }
}
