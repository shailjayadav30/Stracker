import type { Response } from "express";
import prisma from "../db.js";
import AppError from "../error/appError.js";
import { generateStructuredResponse } from "../llmRetry.js";
import { mapWithConcurrency } from "../mapWithConcurrency.js";
import { buildExtractPrompt, type ExtractTarget } from "../prompt/extractPrompt.js";
import type { GeminiFileRef } from "../geminiFiles.js";
import { saveRoadmap } from "./saveRoadmap.js";
import { getGeminiFileForUpload } from "./uploadFile.js";
import { StoredSubjectsSchema } from "./analyze.js";
import { consumeGenerationQuota } from "../../middleware/rateLimit.js";
import { AI_MODELS, GENERATE_LIMITS, PROMPT_VERSION } from "../../config/syllabus.js";
import { RoadmapSchemaV2 } from "../../validationSchema/roadmapSchema.js";
import type { GenerateBody } from "../../validationSchema/requestSchemas.js";

type Target = ExtractTarget & { index: number | null };

type GenerateInput = {
  userId: string;
  uploadId: string;
  body: GenerateBody;
  res: Response;
};

// Extract one subject; retry once without the page hint in case pass 1's range was wrong
async function extractSubject(target: Target, file: GeminiFileRef) {
  const options = { file, model: AI_MODELS.extract };
  let data = await generateStructuredResponse(
    buildExtractPrompt(target),
    RoadmapSchemaV2,
    options,
  );
  if (data.units.length === 0 && target.pages) {
    data = await generateStructuredResponse(
      buildExtractPrompt({ ...target, pages: null }),
      RoadmapSchemaV2,
      options,
    );
  }
  return data;
}

// Pass 2: turn the chosen subjects of an analyzed upload into roadmaps (one per subject)
export async function generateRoadmaps({ userId, uploadId, body, res }: GenerateInput) {
  const upload = await prisma.syllabusUpload.findFirst({
    where: { id: uploadId, userId },
    include: { analysis: true },
  });
  if (!upload || !upload.analysis) {
    throw new AppError("Upload not found", 404);
  }
  // Uploads from before spaces existed aren't in one
  const { spaceId } = upload;
  if (!spaceId) {
    throw new AppError("Upload this PDF again from inside a space to create roadmaps from it.", 410);
  }
  const { analysis } = upload;
  const subjects = StoredSubjectsSchema.parse(analysis.subjectsJson);

  // Resolve what to extract: picked subjects from the analysis, or a custom one
  let targets: Target[];
  if ("subjectIndexes" in body) {
    const indexes = [...new Set(body.subjectIndexes)];
    targets = indexes.map((index) => {
      const subject = subjects[index];
      if (!subject) {
        throw new AppError(`Subject ${index} does not exist in this upload`, 400);
      }
      return {
        index,
        name: subject.name,
        group: subject.group,
        pages: { start: subject.startPage, end: subject.endPage },
      };
    });
  } else {
    const { name, startPage, endPage } = body.custom;
    const clamp = (p: number) => Math.min(Math.max(p, 1), upload.pageCount);
    const start = startPage === undefined ? null : clamp(startPage);
    const end = endPage === undefined ? start : clamp(endPage);
    targets = [
      {
        index: null,
        name,
        group: null,
        pages:
          start === null || end === null
            ? null
            : { start: Math.min(start, end), end: Math.max(start, end) },
      },
    ];
  }

  // Before charging the quota: an unavailable upload (410) shouldn't use up generations
  const file = await getGeminiFileForUpload(upload);

  await consumeGenerationQuota(userId, targets.length, res);

  const results = await mapWithConcurrency(
    targets,
    GENERATE_LIMITS.concurrency,
    async (target) => {
      const subject = { index: target.index, name: target.name, group: target.group };
      try {
        const data = await extractSubject(target, file);
        if (data.units.length === 0) {
          return {
            ...subject,
            status: "FAILED" as const,
            statusCode: 422,
            error: "No syllabus content was found for this subject",
          };
        }
        const roadmap = await saveRoadmap(
          { name: target.name, units: data.units },
          {
            userId,
            documentType: analysis.documentType,
            examOrBoard: analysis.examOrBoard,
            subjectGroup: target.group,
            spaceId,
            promptVersion: PROMPT_VERSION,
            uploadId: upload.id,
          },
        );
        return {
          ...subject,
          status: "SUCCEEDED" as const,
          warnings: data.warnings,
          roadmap,
        };
      } catch (error) {
        console.error(`Generating subject ${target.index ?? "custom"} failed:`, error);
        return {
          ...subject,
          status: "FAILED" as const,
          statusCode: error instanceof AppError ? error.statusCode : 502,
          error:
            error instanceof AppError
              ? error.message
              : "Could not generate a roadmap for this subject",
        };
      }
    },
  );

  // Partial success is still a success; if everything failed, surface the error
  const failures = results.filter((r) => r.status === "FAILED");
  if (failures.length === results.length) {
    const allNoContent = failures.every((f) => f.statusCode === 422);
    throw new AppError(
      results.length === 1 ? failures[0]!.error : "Could not generate any of the selected subjects",
      allNoContent ? 422 : 502,
    );
  }

  // Recently used spaces sort first in the space list
  await prisma.space.update({ where: { id: spaceId }, data: { updatedAt: new Date() } });

  return {
    spaceId,
    // statusCode is only used above to pick the error status
    results: results.map((r) => {
      if (r.status === "SUCCEEDED") return r;
      const { statusCode: _statusCode, ...failure } = r;
      return failure;
    }),
  };
}
