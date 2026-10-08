import type { Request, Response } from "express";
import AppError from "../lib/error/appError.js";
import prisma from "../lib/db.js";
import { getUserId } from "../middleware/authmiddleware.js";
import { studySessionBodySchema } from "../validationSchema/requestSchemas.js";

// WIP: not routed yet
export const StudySession = async (req: Request, _res: Response) => {
  const userId = getUserId(req);
  const { roadmapId, unitId } = studySessionBodySchema.parse(req.body);

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, roadmapId, roadmap: { userId } },
    select: { id: true },
  });
  if (!unit) {
    throw new AppError("Unit not found", 404);
  }

  // TODO: create the study session and send a response
};
