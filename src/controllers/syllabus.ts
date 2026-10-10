import type { Request, Response } from "express";
import { getUserId } from "../middleware/authmiddleware.js";
import { assertPdfUpload } from "../lib/pdfInfo.js";
import { analyzeSyllabus } from "../lib/syllabus/analyze.js";
import { generateRoadmaps } from "../lib/syllabus/generate.js";
import {
  generateBodySchema,
  uploadParamsSchema,
} from "../validationSchema/requestSchemas.js";
import { toApiDocumentType } from "../lib/syllabus/documentType.js";

// POST /api/syllabus/analyze (multipart "pdffile"): list the subjects in a PDF
export const analyze = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const pdf = assertPdfUpload(req.file);

  const { upload, analysis, subjects } = await analyzeSyllabus({
    userId,
    pdf,
    fileName: req.file?.originalname ?? "syllabus.pdf",
    res,
  });

  res.status(200).json({
    uploadId: upload.id,
    expiresAt: upload.expiresAt,
    pageCount: upload.pageCount,
    fromCache: upload.analysisFromCache,
    documentType: toApiDocumentType(analysis.documentType),
    examOrBoard: analysis.examOrBoard,
    language: analysis.language,
    // Send `index` back in POST /syllabus/:uploadId/roadmaps to pick subjects
    subjects: subjects.map((subject, index) => ({ index, ...subject })),
  });
};

// POST /api/syllabus/:uploadId/roadmaps: generate one roadmap per chosen subject
export const generate = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { uploadId } = uploadParamsSchema.parse(req.params);
  const body = generateBodySchema.parse(req.body);

  const result = await generateRoadmaps({ userId, uploadId, body, res });

  res.status(201).json(result);
};
