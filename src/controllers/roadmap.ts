import type { Request, Response } from "express";
import catchAsync from "../lib/error/catchAsync.js";
import AppError from "../lib/error/appError.js";
import prisma from "../lib/db.js";

export const getAllRoadmap = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError("Unauthorized", 401);
  }

  const roadmap = await prisma.roadmap.findMany({
    where: {
      userId: req.user.id,
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

  res.status(200).json({
    message: "Roadmap fetched successfully",
    roadmap,
  });
});

export const getRoadmapById = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("Unauthorized", 401);
    }

    const roadmapId = Array.isArray(req.params.roadmapId)
      ? req.params.roadmapId[0]
      : req.params.roadmapId;

    if (!roadmapId) {
      throw new AppError("Roadmap id missing ", 404);
    }

    const roadmap = await prisma.roadmap.findUnique({
      where: {
        id: roadmapId,
        userId: req.user.id,
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
    if (!roadmap) {
      throw new AppError("Roadmap not found", 404);
    }
    res.status(200).json({
      message: "Roadmap fetched successfully by id ",
      roadmap,
    });
  },
);

export const deleteRoadmapById = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("Unauthorized", 401);
    }
    const roadmapId = Array.isArray(req.params.roadmapId)
      ? req.params.roadmapId[0]
      : req.params.roadmapId;
    if (!roadmapId) {
      throw new AppError("Roadmap id missing", 404);
    }
    const roadmap = await prisma.roadmap.findUnique({
      where: {
        id: roadmapId,
      },
    });

    if (!roadmap) {
      throw new AppError("Roadmap not found", 404);
    }
    const deletedroadmap = await prisma.roadmap.delete({
      where: {
        id: roadmapId,
      },
    });
    res.status(200).json({
      message: "Roadmap deleted successfully by id ",
      deletedroadmap,
    });
  },
);

export const deleteUnitById = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("Unauthorized", 401);
    }
    const unitId = Array.isArray(req.params.unitId)
      ? req.params.unitId[0]
      : req.params.unitId;
    if (!unitId) {
      throw new AppError("Unit id missing", 404);
    }
    const unit = await prisma.unit.findUnique({
      where: {
        id: unitId,
      },
    });

    if (!unit) {
      throw new AppError("Unit not found", 404);
    }
    const deletedUnit = await prisma.unit.delete({
      where: {
        id: unitId,
      },
    });
    res.status(200).json({
      message: "Unit deleted successfully by id ",
      deletedUnit,
    });
  },
);

export const deleteTopicById = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("Unauthorized", 401);
    }
    const topicId = Array.isArray(req.params.topicId)
      ? req.params.topicId[0]
      : req.params.topicId;
    if (!topicId) {
      throw new AppError("Topic id missing", 404);
    }
    const topic = await prisma.topic.findUnique({
      where: {
        id: topicId,
      },
    });

    if (!topic) {
      throw new AppError("Topic not found", 404);
    }
    const deletedTopic = await prisma.topic.delete({
      where: {
        id: topicId,
      },
    });
    res.status(200).json({
      message: "Topic deleted successfully by id ",
      deletedTopic,
    });
  },
);

export const deleteSubTopicById = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("Unauthorized", 401);
    }
    const subTopicId = Array.isArray(req.params.subTopicId)
      ? req.params.subTopicId[0]
      : req.params.subTopicId;
    if (!subTopicId) {
      throw new AppError("SubTopic id missing", 404);
    }
    const subTopic = await prisma.subTopic.findUnique({
      where: {
        id: subTopicId,
      },
    });

    if (!subTopic) {
      throw new AppError("SubTopic not found", 404);
    }
    const deletedSubTopic = await prisma.subTopic.delete({
      where: {
        id: subTopicId,
      },
    });
    res.status(200).json({
      message: "Roadmap deleted successfully by id ",
      deletedSubTopic,
    });
  },
);

export const editRoadmapName = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("unAuthenticated", 401);
    }
    const roadmapId = Array.isArray(req.params.roadmapId)
      ? req.params.roadmapId[0]
      : req.params.roadmapId;
    if (!roadmapId) {
      throw new AppError("Roadmap id not found", 400);
    }

    const { name } = req.body;
    if (!name?.trim()) {
      throw new AppError("Roadmap name is required", 400);
    }
    const roadmap = await prisma.roadmap.update({
      where: {
        id: roadmapId,
      },
      data: {
        name: name.trim(),
      },
    });
    res.status(200).json({ message: "Roadmap updated successfully", roadmap });
  },
);

export const editUnitName = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError("unAuthenticated", 401);
  }
  const unitId = Array.isArray(req.params.unitId)
    ? req.params.unitId[0]
    : req.params.unitId;
  if (!unitId) {
    throw new AppError("Unit id not found", 400);
  }

  const { name } = req.body;
  if (!name?.trim()) {
    throw new AppError("Unit name is required", 400);
  }
  const unit = await prisma.unit.update({
    where: {
      id: unitId,
    },
    data: {
      name: name.trim(),
    },
  });
  res.status(200).json({ message: "Unit  updated successfully", unit });
});

export const editTopicName = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError("unAuthenticated", 401);
  }
  const topicId = Array.isArray(req.params.topicId)
    ? req.params.topicId[0]
    : req.params.topicId;
  if (!topicId) {
    throw new AppError("topic id not found", 400);
  }

  const { name } = req.body;
  if (!name?.trim()) {
    throw new AppError("Topic name is required", 400);
  }
  const topic = await prisma.topic.update({
    where: {
      id: topicId,
    },
    data: {
      name: name.trim(),
    },
  });
  res.status(200).json({ message: "Topic updated successfully", topic });
});

export const editSubTopicName = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("unAuthenticated", 401);
    }
    const subTopicId = Array.isArray(req.params.subtopicId)
      ? req.params.subtopicId[0]
      : req.params.subtopicId;
    if (!subTopicId) {
      throw new AppError("SubTopic id not found", 400);
    }

    const { name } = req.body;
    if (!name?.trim()) {
      throw new AppError("SubTopic name is required", 400);
    }
    const topic = await prisma.subTopic.update({
      where: {
        id: subTopicId,
      },
      data: {
        name: name.trim(),
      },
    });
    res.status(200).json({ message: "SubTopic updated successfully", topic });
  },
);

export const completeTopic = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError("Unauthenticated", 401);
  }
  const topicId = Array.isArray(req.params.topicId)
    ? req.params.topicId[0]
    : req.params.topicId;
  if (!topicId) {
    throw new AppError("Topic Id not found", 400);
  }
  const { completed } = req.body;
  const topicCompleted = await prisma.$transaction(async (tx) => {
    const topic = await tx.topic.update({
      where: {
        id: topicId,
      },
      data: {
        completed,
      },
    });
    await tx.subTopic.updateMany({
      where: {
        topicId: topicId,
      },
      data: {
        completed,
      },
    });
    return topic;
  });

  res
    .status(200)
    .json({ message: "Task completed successfully", topic: topicCompleted });
});

export const followingRoadmap = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("Unauthorized", 401);
    }
    const { isFollowing } = req.body;
    const roadmapId = Array.isArray(req.params.roadmapId)
      ? req.params.roadmapId[0]
      : req.params.roadmapId;
    if (!roadmapId) {
      throw new AppError("Roadmap Id not found", 400);
    }
    if (typeof isFollowing !== "boolean") {
      throw new AppError("isFollowing must be a boolean", 400);
    }
    const roadmap = await prisma.roadmap.findFirst({
      where: {
        id: roadmapId,
        userId: req.user.id,
      },
      select: {
        id: true,
      },
    });
    if (!roadmap) {
      throw new AppError("Roadmap not found", 404);
    }
    await prisma.roadmap.update({
      where: {
        id: roadmap.id,
      },
      data: {
        isFollowing,
      },
    });
    return res.status(200).json({
      message: isFollowing
        ? "Roadmap is now being followed"
        : "Roadmap unfollowed",
    });
  },
);

export const getFollowingRoadMaps = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("Unauthorized", 401);
    }

    const roadmaps = await prisma.roadmap.findMany({
      where: {
        userId: req.user.id,
        isFollowing: true,
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

    res.status(200).json({
      message:
        roadmaps.length > 0
          ? "Following roadmaps retrieved successfully"
          : "You are not following any roadmap",
      roadmaps,
    });
  },
);
