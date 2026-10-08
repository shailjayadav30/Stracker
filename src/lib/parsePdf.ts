import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import AppError from "./error/appError.js";

export async function parsePdf(pdf: Buffer) {
  const pdfData = new PDFParse({ data: pdf, CanvasFactory });
  try {
    const extractedText = await pdfData.getText();
    if (!extractedText.text.trim()) {
      throw new AppError("Could not extract any text from this PDF", 422);
    }
    console.log("PDF extracted characters:", extractedText.text.length);
    return extractedText.text;
  } finally {
    await pdfData.destroy();
  }
}
