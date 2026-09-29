import type { Request, Response } from "express";
import fs from "node:fs";

import { parsePdf } from "../lib/parsePdf.js";
import { RoadmapSchema } from "../validationSchema/roadmapSchema.js";
import AppError from "../lib/error/appError.js";
import catchAsync from "../lib/error/catchAsync.js";
import { generateStructuredResponse } from "../lib/llmRetry.js";
import { buildUserPrompt } from "../lib/prompt/userPrompt.js";
import prisma from "../lib/db.js";

export const uploadfile = catchAsync(async (req: Request, res: Response) => {
  // -----------------------------
  // 1. Authentication
  // -----------------------------
  if (!req.user?.id) {
    throw new AppError("Unauthorized", 401);
  }

  // -----------------------------
  // 2. File validation
  // -----------------------------
  if (!req.file) {
    throw new AppError("No file uploaded", 400);
  }

  if (req.file.mimetype !== "application/pdf") {
    throw new AppError("Uploaded file must be a PDF", 400);
  }

  const pdfBuffer = req.file.buffer;

  const header = pdfBuffer.subarray(0, 5).toString("latin1");

  if (header !== "%PDF-") {
    throw new AppError("File is not a valid PDF", 400);
  }

  // console.log("========== PDF DEBUG ==========");
  // console.log("Filename:", req.file.originalname);
  // console.log("Mimetype:", req.file.mimetype);
  // console.log("Size:", req.file.size);
  // console.log("Buffer length:", pdfBuffer.length);
  // console.log("PDF header:", header);
  // console.log("================================");

  // Temporary debugging
  // fs.writeFileSync("./debug-upload.pdf", pdfBuffer);

  // -----------------------------
  // 3. Extract PDF text
  // -----------------------------
  let rawText: string;

  try {
    rawText = await parsePdf(pdfBuffer);
  } catch (err: any) {
    console.error("PDF parsing failed:", err);

    if (err?.name === "InvalidPDFException") {
      throw new AppError(
        "This PDF appears to be corrupted or unreadable. Try re-saving it as a PDF.",
        422,
      );
    }

    throw err;
  }

  // console.log("========== PDF TEXT ==========");
  // console.log("Extracted text length:", rawText.length);
  // console.log("First 2000 chars:");
  // console.log(rawText.slice(0, 2000));
  // console.log("================================");

  if (!rawText.trim()) {
    throw new AppError("Could not extract any text from the PDF", 422);
  }

  // -----------------------------
  // 4. Prepare text for Gemini
  // -----------------------------
  const testText = rawText.slice(0, 20_000);

  // console.log("Text sent to Gemini:", testText.length);

  const prompt = buildUserPrompt(testText);

  // console.log("Prompt characters:", prompt.length);

  // -----------------------------
  // 5. Generate roadmap
  // -----------------------------
  const roadmapData = await generateStructuredResponse(prompt, RoadmapSchema);

  // console.log("========== ROADMAP DATA ==========");
  // console.dir(roadmapData, {
  //   depth: null,
  // });
  // console.log("==================================");

  // -----------------------------
  // 6. Validate generated roadmap
  // -----------------------------
  if (!roadmapData.units.length) {
    throw new AppError(
      "Could not extract any roadmap content from this PDF",
      422,
    );
  }
  // console.log("Extracted text length:", rawText.length);
  // console.log("Extracted text:", rawText.slice(0, 2000));
  // -----------------------------
  // 7. Save to database
  // -----------------------------
  const createdRoadmap = await prisma.roadmap.create({
    data: {
      name: roadmapData.name,
      userId: req.user.id,

      units: {
        create: roadmapData.units.map((unit) => ({
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
    },
    include: {
      units: {
        include: {
          topics: {
            include: {
              subTopics: true,
            },
          },
        },
      },
    },
  });

  // -----------------------------
  // 8. Response
  // -----------------------------
  res.status(201).json({
    success: true,
    roadmap: createdRoadmap,
  });
});
