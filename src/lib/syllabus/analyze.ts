import type { Response } from "express";
import z from "zod";
import prisma from "../db.js";
import AppError from "../error/appError.js";
import { countPdfPages, hashPdf } from "../pdfInfo.js";
import { deleteGeminiFile, uploadPdfToGemini } from "../geminiFiles.js";
import { storePdf } from "../pdfStorage.js";
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

// Pass 1: detect the subjects in a PDF; keep the PDF in S3 storage (permanent) and/or Gemini (~48h)
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

  // Gemini copy of the PDF: needed for detection; later generate calls can restore it from storage
  let gemini: Awaited<ReturnType<typeof uploadPdfToGemini>> | null = null;
  try {
    if (!analysis) {
      gemini = await uploadPdfToGemini(pdf, fileName);
      const detected = await generateStructuredResponse(
        buildDetectPrompt(pageCount),
        DetectedStructureSchema,
        { file: gemini.ref, model },
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

    // Permanent copy, so subjects can be generated months later (stored once per hash)
    const storageKey = await storePdf(pdf, pdfHash);
    // Without a stored copy, generate needs a live Gemini copy
    if (!gemini && !storageKey) {
      gemini = await uploadPdfToGemini(pdf, fileName);
    }

    const upload = await prisma.syllabusUpload.create({
      data: {
        userId,
        pdfHash,
        pageCount,
        fileName,
        storageKey,
        geminiFileName: gemini?.ref.name ?? null,
        geminiFileUri: gemini?.ref.uri ?? null,
        // No Gemini copy yet: generate uploads one from storage
        expiresAt: gemini?.expiresAt ?? new Date(),
        analysisId: analysis.id,
        analysisFromCache: fromCache,
      },
    });
    return { upload, analysis, subjects };
  } catch (error) {
    // Nothing will reference the Gemini file, so don't keep it for 48h
    if (gemini) await deleteGeminiFile(gemini.ref.name);
    throw error;
  }
}
