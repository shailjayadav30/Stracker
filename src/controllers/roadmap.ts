import type { Request, Response } from "express";
import AppError from "../lib/error/appError.js";
import prisma from "../lib/db.js";
import { roadmapTree } from "../lib/roadmapTree.js";
import { listRoadmapSummaries } from "../lib/roadmapSummary.js";
import { getUserId } from "../middleware/authmiddleware.js";
import {
  completeBodySchema,
  followBodySchema,
  listQuerySchema,
  nameBodySchema,
  roadmapParamsSchema,
  subTopicParamsSchema,
  topicParamsSchema,
  unitParamsSchema,
} from "../validationSchema/requestSchemas.js";

// Missing records / records owned by another user surface as Prisma P2025 → 404 in the error handler.

export const getAllRoadmap = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const query = listQuerySchema.parse(req.query);

  const { roadmaps, nextCursor } = await listRoadmapSummaries(
    { userId },
    query,
  );

  // Response key stays `roadmap` for API compatibility
  res.status(200).json({
    message: "Roadmap fetched successfully",
    roadmap: roadmaps,
    nextCursor,
  });
};

export const getRoadmapById = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { roadmapId } = roadmapParamsSchema.parse(req.params);

  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId, userId },
    include: roadmapTree,
  });
  if (!roadmap) {
    throw new AppError("Roadmap not found", 404);
  }

  res.status(200).json({
    message: "Roadmap fetched successfully by id",
    roadmap,
  });
};

export const deleteRoadmapById = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { roadmapId } = roadmapParamsSchema.parse(req.params);

  const deletedroadmap = await prisma.roadmap.delete({
    where: { id: roadmapId, userId },
  });

  res.status(200).json({
    message: "Roadmap deleted successfully by id",
    deletedroadmap,
  });
};

export const deleteUnitById = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { unitId } = unitParamsSchema.parse(req.params);

  const deletedUnit = await prisma.unit.delete({
    where: { id: unitId, roadmap: { userId } },
  });

  res.status(200).json({
    message: "Unit deleted successfully by id",
    deletedUnit,
  });
};

export const deleteTopicById = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { topicId } = topicParamsSchema.parse(req.params);

  const deletedTopic = await prisma.topic.delete({
    where: { id: topicId, unit: { roadmap: { userId } } },
  });

  res.status(200).json({
    message: "Topic deleted successfully by id",
    deletedTopic,
  });
};

export const deleteSubTopicById = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { subTopicId } = subTopicParamsSchema.parse(req.params);

  const deletedSubTopic = await prisma.subTopic.delete({
    where: { id: subTopicId, topic: { unit: { roadmap: { userId } } } },
  });

  res.status(200).json({
    message: "SubTopic deleted successfully by id",
    deletedSubTopic,
  });
};

export const editRoadmapName = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { roadmapId } = roadmapParamsSchema.parse(req.params);
  const { name } = nameBodySchema.parse(req.body);

  const roadmap = await prisma.roadmap.update({
    where: { id: roadmapId, userId },
    data: { name },
  });

  res.status(200).json({ message: "Roadmap updated successfully", roadmap });
};

export const editUnitName = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { unitId } = unitParamsSchema.parse(req.params);
  const { name } = nameBodySchema.parse(req.body);

  const unit = await prisma.unit.update({
    where: { id: unitId, roadmap: { userId } },
    data: { name },
  });

  res.status(200).json({ message: "Unit updated successfully", unit });
};

export const editTopicName = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { topicId } = topicParamsSchema.parse(req.params);
  const { name } = nameBodySchema.parse(req.body);

  const topic = await prisma.topic.update({
    where: { id: topicId, unit: { roadmap: { userId } } },
    data: { name },
  });

  res.status(200).json({ message: "Topic updated successfully", topic });
};

export const editSubTopicName = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { subTopicId } = subTopicParamsSchema.parse(req.params);
  const { name } = nameBodySchema.parse(req.body);

  const topic = await prisma.subTopic.update({
    where: { id: subTopicId, topic: { unit: { roadmap: { userId } } } },
    data: { name },
  });

  // Response key stays `topic` for API compatibility
  res.status(200).json({ message: "SubTopic updated successfully", topic });
};
export const completeUnit = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { unitId } = unitParamsSchema.parse(req.params);
  const { completed } = completeBodySchema.parse(req.body);

  await prisma.$transaction(async (tx) => {
    await tx.unit.findUniqueOrThrow({
      where: { id: unitId, roadmap: { userId } },
      select: { id: true },
    });
    await tx.topic.updateMany({ where: { unitId }, data: { completed } });
    await tx.subTopic.updateMany({
      where: { topic: { unitId } },
      data: { completed },
    });
  });

  res.status(200).json({ message: "Unit updated successfully" });
};

export const completeTopic = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { topicId } = topicParamsSchema.parse(req.params);
  const { completed } = completeBodySchema.parse(req.body);

  const topic = await prisma.$transaction(async (tx) => {
    const updated = await tx.topic.update({
      where: { id: topicId, unit: { roadmap: { userId } } },
      data: { completed },
    });
    await tx.subTopic.updateMany({
      where: { topicId },
      data: { completed },
    });
    return updated;
  });

  res.status(200).json({ message: "Task completed successfully", topic });
};

export const completeSubTopic = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { subTopicId } = subTopicParamsSchema.parse(req.params);
  const { completed } = completeBodySchema.parse(req.body);

  const subTopic = await prisma.$transaction(async (tx) => {
    const updated = await tx.subTopic.update({
      where: { id: subTopicId, topic: { unit: { roadmap: { userId } } } },
      data: { completed },
    });
    // A topic counts as done once all of its subtopics are
    const remaining = await tx.subTopic.count({
      where: { topicId: updated.topicId, completed: false },
    });
    await tx.topic.update({
      where: { id: updated.topicId },
      data: { completed: remaining === 0 },
    });
    return updated;
  });

  res.status(200).json({ message: "SubTopic updated successfully", subTopic });
};

export const followingRoadmap = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { roadmapId } = roadmapParamsSchema.parse(req.params);
  const { isFollowing } = followBodySchema.parse(req.body);

  await prisma.roadmap.update({
    where: { id: roadmapId, userId },
    data: { isFollowing },
    select: { id: true },
  });

  res.status(200).json({
    message: isFollowing
      ? "Roadmap is now being followed"
      : "Roadmap unfollowed",
  });
};

export const getFollowingRoadMaps = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const query = listQuerySchema.parse(req.query);

  const { roadmaps, nextCursor } = await listRoadmapSummaries(
    { userId, isFollowing: true },
    query,
  );

  res.status(200).json({
    message:
      roadmaps.length > 0
        ? "Following roadmaps retrieved successfully"
        : "You are not following any roadmap",
    roadmaps,
    nextCursor,
  });
};
