import { PDFParse } from "pdf-parse";
export async function parsePdf(pdf: Buffer) {
  const pdfData = new PDFParse({ data: pdf });
  const extractedText = await pdfData.getText();
  if (!extractedText) {
    throw new Error("Could not extract any text from this PDF");
  }
 await pdfData.destroy()
  console.log("pdf result", extractedText.text.length);
  return extractedText.text;
}
