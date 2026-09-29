import "pdf-parse/worker";
import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
export async function parsePdf(pdf: Buffer) {
  const pdfData = new PDFParse({ data: pdf,CanvasFactory });
  const extractedText = await pdfData.getText();
  console.log("pdf result", extractedText);
  if (!extractedText) {
    throw new Error("Could not extract any text from this PDF");
  }
 await pdfData.destroy()
  console.log("pdf result", extractedText.text.length);
  console.log("pdf result", extractedText);
  return extractedText.text;
}

// import { PDFParse } from "pdf-parse";

// export async function parsePdf(pdf: Buffer) {
//   const pdfData = new PDFParse({
//     data: pdf,
//   });

//   try {
//     const extractedText = await pdfData.getText();
// console.log("Extracted text",extractedText)
//     if (!extractedText?.text?.trim()) {
//       throw new Error("Could not extract any text from this PDF");
//     }

//     console.log("PDF extracted characters:", extractedText.text.length);

//     return extractedText.text;
//   } finally {
//     await pdfData.destroy();
//   }
// }
