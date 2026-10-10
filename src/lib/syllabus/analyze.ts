import type { Response } from "express";
import z from "zod";
import prisma from "../db.js";
import AppError from "../error/appError.js";
import { countPdfPages, hashPdf } from "../pdfInfo.js";
import { deleteGeminiFile, uploadPdfToGemini } from "../geminiFiles.js";
import { generateStructuredResponse } from "../llmRetry.js";
import { buildDetectPrompt } from "../prompt/detectPrompt.js";
import { consumeAnalyzeQuota } from "../../middleware/rateLimit.js";
import { AI_MODELS, PROMPT_VERSION, UPLOAD_LIMITS } from "../../config/syllabus.js";
import {
  DetectedStructureSchema,
  type DetectedStructure,
} from "../../validationSchema/detectedSchema.js";
import type { DocumentType } from "../../generated/prisma/client.js";

// Shape of SyllabusAnalysis.subjectsJson
export const StoredSubjectsSchema = z.array(
  z.object({
    name: z.string(),
    group: z.string().nullable(),
    startPage: z.number().int(),
    endPage: z.number().int(),
  }),
);
export type StoredSubject = z.infer<typeof StoredSubjectsSchema>[number];

const MAX_SUBJECTS = 200;

export const toDocumentType: Record<DetectedStructure["documentType"], DocumentType> = {
  school: "SCHOOL",
  college: "COLLEGE",
  competitive_exam: "COMPETITIVE_EXAM",
  professional: "PROFESSIONAL",
  other: "OTHER",
};

// The model's page numbers can be off: keep them inside the PDF and in order
export function normalizeSubjects(
  subjects: DetectedStructure["subjects"],
  pageCount: number,
): StoredSubject[] {
  const clamp = (page: number) => Math.min(Math.max(page, 1), pageCount);
  return subjects.slice(0, MAX_SUBJECTS).map((s) => {
    const a = clamp(s.startPage);
    const b = clamp(s.endPage);
    return {
      name: s.name.trim(),
      group: s.group?.trim() || null,
      startPage: Math.min(a, b),
      endPage: Math.max(a, b),
    };
  });
}

type AnalyzeInput = {
  userId: string;
  pdf: Buffer;
  fileName: string;
  res: Response;
};

// Pass 1: detect the subjects in a PDF and keep the PDF in Gemini for the generate step
export async function analyzeSyllabus({ userId, pdf, fileName, res }: AnalyzeInput) {
  // Checked locally first, so rejected files cost nothing
  const pageCount = await countPdfPages(pdf);
  if (pageCount > UPLOAD_LIMITS.maxPages) {
    throw new AppError(
      `This PDF has ${pageCount} pages (max ${UPLOAD_LIMITS.maxPages}). Upload only the part that has your syllabus.`,
      422,
    );
  }

  const pdfHash = hashPdf(pdf);
  const model = AI_MODELS.detect;
  const cacheKey = { pdfHash, promptVersion: PROMPT_VERSION, model };
  let analysis = await prisma.syllabusAnalysis.findUnique({
    where: { pdfHash_promptVersion_model: cacheKey },
  });
  const fromCache = analysis !== null;

  if (analysis && !analysis.isSyllabus) {
    throw new AppError("This doesn't look like a syllabus", 422);
  }
  // Cache hits are free, so only fresh analyses count toward the daily limit
  if (!analysis) {
    await consumeAnalyzeQuota(userId, res);
  }

  // Needed even on a cache hit: the generate step reads the PDF from Gemini
  const { ref, expiresAt } = await uploadPdfToGemini(pdf, fileName);
  try {
    if (!analysis) {
      const detected = await generateStructuredResponse(
        buildDetectPrompt(pageCount),
        DetectedStructureSchema,
        { file: ref, model },
      );
      const subjects = detected.isSyllabus
        ? normalizeSubjects(detected.subjects, pageCount)
        : [];
      const fields = {
        isSyllabus: detected.isSyllabus,
        documentType: toDocumentType[detected.documentType],
        examOrBoard: detected.examOrBoard?.trim() || null,
        language: detected.language || null,
        subjectsJson: subjects,
      };
      // upsert: another user may have analyzed the same PDF at the same moment
      analysis = await prisma.syllabusAnalysis.upsert({
        where: { pdfHash_promptVersion_model: cacheKey },
        create: { ...cacheKey, ...fields },
        update: {},
      });
    }

    const subjects = StoredSubjectsSchema.parse(analysis.subjectsJson);
    if (!analysis.isSyllabus) {
      throw new AppError("This doesn't look like a syllabus", 422);
    }
    if (subjects.length === 0) {
      throw new AppError("No subjects were found in this syllabus", 422);
    }

    const upload = await prisma.syllabusUpload.create({
      data: {
        userId,
        pdfHash,
        pageCount,
        fileName,
        geminiFileName: ref.name,
        geminiFileUri: ref.uri,
        expiresAt,
        analysisId: analysis.id,
        analysisFromCache: fromCache,
      },
    });
    return { upload, analysis, subjects };
  } catch (error) {
    // Nothing will reference the Gemini file, so don't keep it for 48h
    await deleteGeminiFile(ref.name);
    throw error;
  }
}
