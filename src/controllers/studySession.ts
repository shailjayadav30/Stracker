import type { Request, Response } from "express";
import AppError from "../lib/error/appError.js";
import prisma from "../lib/db.js";
export async function StudySession(req: Request, res: Response) {
  if (!req.user?.id) {
    throw new AppError("Unauthorized", 401);
  }

  const { roadmapId, unitId, plannedDuration, startedAt, endedAt } = req.body;
  if (!roadmapId && unitId && plannedDuration && startedAt && endedAt) {
    throw new AppError("All fields are required", 404);
  }

  const roadmap = await prisma.roadmap.findFirst({
    where: {
      id: roadmapId,
      userId: req.user.id,
    },
  });
  const unit=await prisma.unit.findFirst({
    where:{
        id:unitId,
        roadmapId:roadmapId
    }
  })
}
