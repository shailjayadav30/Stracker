import type { Request, Response } from "express";
import { parsePdf } from "../lib/parsePdf.js";
import { llmCall } from "../lib/lllmcall.js";
import { SyllabusSchema } from "../validationSchema/roadmapSchema.js";
import AppError from "../lib/error/appError.js";
import catchAsync from "../lib/error/catchAsync.js";

export const uploadfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("No file uploaded", 400);
  }
  const pdf = req.file.buffer;

  const parsedPdf =await parsePdf(pdf);
  // FIXME: still no length cap on the interpolated PDF text — a large PDF
  //   can blow past the model's context/token limit; consider truncating or
  //   chunking before building the prompt.
  const userPrompt = `
      You are an expert data assistant. Below is the text content extracted from a PDF document.
      Please analyze this content and structure it as a detailed roadmap of the syllabus.

      For each subject, break its content down into units. Each unit should contain
      multiple topics, and each topic should list its own subtopics. Group related
      material under the same topic rather than listing everything flat.

      --- START OF PDF CONTENT ---
      ${parsedPdf}
      --- END OF PDF CONTENT ---
    `;
  const llmAns = await llmCall(userPrompt);
  if (!llmAns) {
    throw new AppError("could not generate response", 502);
  }
  const parsed=SyllabusSchema.safeParse(JSON.parse(llmAns))
//  if(!parsed.success){

//  }
  // FIXME: still sends back the raw LLM text with no structure/validation
  //   step. Per your stated plan (structure syllabus -> validate with zod
  //   -> store in DB -> show user), none of the parsing/validation/DB-write
  //   steps are implemented yet — this only returns the raw analysis to the
  //   caller, nothing is persisted.
  res.status(201).json({
    success: true,

    analysis: llmAns,
  });
});
