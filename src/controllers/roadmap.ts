import type { Request, Response } from "express";
import catchAsync from "../lib/error/catchAsync.js";
import AppError from "../lib/error/appError.js";
import prisma from "../lib/db.js";
export const getAllRoadmap = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError("Unauthorized", 401);
  }

  const syllabus = await prisma.syllabus.findMany({
    include: {
      subjects: {
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
      },
    },
  });

  if (!syllabus) {
    throw new AppError("Syllabus not found", 400);
  }
  res.status(200).json({
    message: "Syllabus fetched successfully",
    syllabus,
  });
});

export const getRoadmapById = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("Unauthorized", 401);
    }

    const syllabusId = Array.isArray(req.params.syllabusId)
      ? req.params.syllabusId[0]
      : req.params.syllabusId;

    if (!syllabusId) {
      throw new AppError("Syllabus id missing ", 404);
    }

    const syllabus = await prisma.syllabus.findUnique({
      where: {
        id: syllabusId,
      },
      include: {
        subjects: {
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
        },
      },
    });

    res.status(200).json({
      message: "Syllabus fetched successfully by id ",
      syllabus,
    });
  },
);

export const deleteRoadmapById = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("Unauthorized", 401);
    }
    const syllabusId = Array.isArray(req.params.syllabusId)
      ? req.params.syllabusId[0]
      : req.params.syllabusId;
    if (!syllabusId) {
      throw new AppError("Syllabus id missing", 404);
    }
    const syllabus = await prisma.syllabus.findUnique({
      where: {
        id: syllabusId,
      },
    });

    if (!syllabus) {
      throw new AppError("Syllabus not found", 404);
    }
    const deletedsyllabus = await prisma.syllabus.delete({
      where: {
        id: syllabusId,
      },
    });
    res.status(200).json({
      message: "Syllabus deleted successfully by id ",
      deletedsyllabus,
    });
  },
);

export const editSubjectName = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("unAuthenticated", 401);
    }
    const subjectId = Array.isArray(req.params.subjectId)
      ? req.params.subjectId[0]
      : req.params.subjectId;
    if (!subjectId) {
      throw new AppError("subject id not found", 400);
    }

    const { name } = req.body;
    if (!name?.trim()) {
      throw new AppError("Subject name is required", 400);
    }
    const subject = await prisma.subject.update({
      where: {
        id: subjectId,
      },
      data: {
        name: name.trim(),
      },
    });
    res.status(200).json({ message: "Subject  updated successfully", subject });
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
    const topic = await prisma.subTopics.update({
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
