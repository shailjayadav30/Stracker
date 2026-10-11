import prisma from "../db.js";
import AppError from "../error/appError.js";
import {
  isGeminiFileUsable,
  uploadPdfToGemini,
  type GeminiFileRef,
} from "../geminiFiles.js";
import { canReadStoredPdf, isMissingObjectError, readPdf } from "../pdfStorage.js";
import type { SyllabusUpload } from "../../generated/prisma/client.js";

type UploadFiles = Pick<
  SyllabusUpload,
  "id" | "fileName" | "storageKey" | "geminiFileName" | "geminiFileUri" | "expiresAt"
>;

// Whether subjects can still be generated from this upload
export function canGenerateFrom(
  upload: Pick<UploadFiles, "storageKey" | "geminiFileName" | "expiresAt">,
) {
  const geminiCopyValid = Boolean(upload.geminiFileName && upload.expiresAt > new Date());
  return geminiCopyValid || Boolean(upload.storageKey && canReadStoredPdf(upload.storageKey));
}

const unavailable = () =>
  new AppError("This upload is no longer available. Please upload the PDF again.", 410);

// Gemini file for an upload. Gemini deletes files after ~48h (and a different API key
// can't read them), so when the copy is gone, upload it again from permanent storage.
export async function getGeminiFileForUpload(upload: UploadFiles): Promise<GeminiFileRef> {
  if (
    upload.geminiFileName &&
    upload.geminiFileUri &&
    upload.expiresAt > new Date() &&
    (await isGeminiFileUsable(upload.geminiFileName))
  ) {
    return { name: upload.geminiFileName, uri: upload.geminiFileUri, mimeType: "application/pdf" };
  }

  if (!upload.storageKey || !canReadStoredPdf(upload.storageKey)) {
    // Remember it's gone so canGenerate turns false
    await prisma.syllabusUpload.update({
      where: { id: upload.id },
      data: { geminiFileName: null, geminiFileUri: null },
    });
    throw unavailable();
  }

  let pdf: Buffer;
  try {
    pdf = await readPdf(upload.storageKey);
  } catch (error) {
    console.error("Failed to read stored PDF:", upload.storageKey, error);
    if (isMissingObjectError(error)) throw unavailable();
    throw new AppError("Could not load the PDF, please try again", 502);
  }

  const { ref, expiresAt } = await uploadPdfToGemini(pdf, upload.fileName ?? "syllabus.pdf");
  await prisma.syllabusUpload.update({
    where: { id: upload.id },
    data: { geminiFileName: ref.name, geminiFileUri: ref.uri, expiresAt },
  });
  return ref;
}
