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
import {
  canReadStoredPdf,
  getPdfPageImages,
  getPdfViewUrl,
} from "../lib/pdfStorage.js";
import prisma from "../lib/db.js";
import AppError from "../lib/error/appError.js";

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
    // null when the PDF is stored permanently (subjects can be generated any time)
    expiresAt: upload.storageKey ? null : upload.expiresAt,
    hasPdf: Boolean(upload.storageKey),
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

// GET /api/syllabus/uploads/:uploadId/pdf: the uploaded PDF for viewing in the app.
// `url` is a short-lived link to the original; `pages` has one image per page when the
// storage can render them (Cloudinary), otherwise null.
export const getUploadPdf = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { uploadId } = uploadParamsSchema.parse(req.params);

  const upload = await prisma.syllabusUpload.findFirst({
    where: { id: uploadId, userId },
    select: { storageKey: true, fileName: true, pageCount: true },
  });
  if (!upload) {
    throw new AppError("Upload not found", 404);
  }
  if (!upload.storageKey || !canReadStoredPdf(upload.storageKey)) {
    throw new AppError("The PDF for this upload isn't stored", 404);
  }

  const fileName = upload.fileName ?? "syllabus.pdf";
  const { url, expiresAt } = await getPdfViewUrl(upload.storageKey, fileName);
  res.status(200).json({
    url,
    expiresAt,
    fileName,
    pageCount: upload.pageCount,
    pages: getPdfPageImages(upload.storageKey, upload.pageCount),
  });
};
