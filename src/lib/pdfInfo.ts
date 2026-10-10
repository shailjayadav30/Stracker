import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import AppError from "./error/appError.js";

// Checks multer's file and returns its bytes; rejects anything that isn't a real PDF
export function assertPdfUpload(file: Express.Multer.File | undefined): Buffer {
  if (!file) {
    throw new AppError("No file uploaded", 400);
  }
  if (file.mimetype !== "application/pdf") {
    throw new AppError("Uploaded file must be a PDF", 400);
  }
  if (file.buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new AppError("File is not a valid PDF", 400);
  }
  return file.buffer;
}

export function hashPdf(pdf: Buffer): string {
  return createHash("sha256").update(pdf).digest("hex");
}

// Counted locally, so oversized PDFs are rejected before any AI cost
export async function countPdfPages(pdf: Buffer): Promise<number> {
  try {
    const doc = await PDFDocument.load(pdf, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    return doc.getPageCount();
  } catch {
    throw new AppError(
      "This PDF appears to be corrupted or unreadable. Try re-saving it as a PDF.",
      422,
    );
  }
}
