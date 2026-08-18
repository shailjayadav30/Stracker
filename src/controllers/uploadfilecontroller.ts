import type { Request, Response } from "express";
import { parsePdf } from "../lib/parsePdf.js";
import { llmCall } from "../lib/lllmcall.js";
import { SyllabusSchema } from "../validationSchema/roadmapSchema.js";

export async function uploadfile(req: Request, res: Response) {
  try {
    
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
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
     return res.status(502).json({
        message: "could not generate response",
      });
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
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}
