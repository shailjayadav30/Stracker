import type { Request, Response } from "express";
import { parsePdf } from "../lib/parsePdf.js";
import { RoadmapSchema } from "../validationSchema/roadmapSchema.js";
import AppError from "../lib/error/appError.js";
import { generateStructuredResponse } from "../lib/llmRetry.js";
import { buildUserPrompt } from "../lib/prompt/userPrompt.js";
import prisma from "../lib/db.js";
import { getUserId } from "../middleware/authmiddleware.js";

const MAX_PROMPT_TEXT_CHARS = 20_000;

export const uploadfile = async (req: Request, res: Response) => {
  const userId = getUserId(req);

  // 1. File validation
  if (!req.file) {
    throw new AppError("No file uploaded", 400);
  }
  if (req.file.mimetype !== "application/pdf") {
    throw new AppError("Uploaded file must be a PDF", 400);
  }
  const pdfBuffer = req.file.buffer;
  if (pdfBuffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new AppError("File is not a valid PDF", 400);
  }

  // 2. Extract PDF text
  let rawText: string;
  try {
    rawText = await parsePdf(pdfBuffer);
  } catch (err) {
    if (err instanceof Error && err.name === "InvalidPDFException") {
      throw new AppError(
        "This PDF appears to be corrupted or unreadable. Try re-saving it as a PDF.",
        422,
      );
    }
    throw err;
  }

  // 3. Generate roadmap (text is capped to keep the prompt within budget)
  const promptText = rawText.slice(0, MAX_PROMPT_TEXT_CHARS);
  const roadmapData = await generateStructuredResponse(
    buildUserPrompt(promptText),
    RoadmapSchema,
  );
  if (roadmapData.units.length === 0) {
    throw new AppError("No syllabus content was found in this PDF", 422);
  }
  // Fall back to the file name if the model found content but no title
  const roadmapName =
    roadmapData.name.trim() ||
    req.file.originalname.replace(/\.pdf$/i, "").trim() ||
    "Untitled roadmap";

  // 4. Save to database
  const createdRoadmap = await prisma.roadmap.create({
    data: {
      name: roadmapName,
      userId,
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

  res.status(201).json({
    success: true,
    roadmap: createdRoadmap,
  });
};
