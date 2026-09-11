import type { Request, Response } from "express";
import { parsePdf } from "../lib/parsePdf.js";
import { SyllabusSchema } from "../validationSchema/roadmapSchema.js";
import AppError from "../lib/error/appError.js";
import catchAsync from "../lib/error/catchAsync.js";
import { generateStructuredResponse } from "../lib/llmRetry.js";
import { buildUserPrompt } from "../lib/prompt/userPrompt.js";
import prisma from "../lib/db.js";
export const uploadfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError("Unauthorized", 401);
  }
  if (!req.file) {
    throw new AppError("No file uploaded", 400);
  }
  if (req.file.mimetype !== "application/pdf") {
    throw new AppError("Uploaded file must be a PDF", 400);
  }
  const syllabusName = req.body?.name?.trim();
  if (!syllabusName) {
    throw new AppError("Syllabus name is required", 400);
  }
  const pdfBuffer = req.file.buffer;

  const rawText = await parsePdf(pdfBuffer);

  if (!rawText || rawText.trim().length === 0) {
    throw new AppError("Could not extract any text from the PDF", 422);
  }
  const testText = rawText.slice(0, 20_000);

  const prompt = buildUserPrompt(testText);
  // console.log("Final prompt length:", prompt.length);
  const syllabus = await generateStructuredResponse(prompt, SyllabusSchema);
  const savedSyllabus = await prisma.syllabus.create({
    data: {
      name: syllabusName,
      userId: req.user?.id,
      subjects: {
        create: syllabus.subjects.map((subject) => ({
          name: subject.name,
          units: {
            create: subject.units.map((unit) => ({
              name: unit.name,
              topics: {
                create: unit.topics.map((topic) => ({
                  name: topic.name,
                  subTopics: {
                    create: topic.subTopics.map((subTopic) => ({
                      name: subTopic,
                    })),
                  },
                })),
              },
            })),
          },
        })),
      },
    },
  });
  res.status(201).json({
    success: true,

    analysis: syllabus,
  });
});
