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

export const deleteSubjectById = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("Unauthorized", 401);
    }
    const subjectId = Array.isArray(req.params.subjectId)
      ? req.params.subjectId[0]
      : req.params.subjectId;
    if (!subjectId) {
      throw new AppError("Subject id missing", 404);
    }
    const subject = await prisma.subject.findUnique({
      where: {
        id: subjectId,
      },
    });

    if (!subject) {
      throw new AppError("Subject not found", 404);
    }
    const deletedsubject = await prisma.subject.delete({
      where: {
        id: subjectId,
      },
    });
    res.status(200).json({
      message: "Subject deleted successfully by id ",
      deletedsubject,
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
    const subTopic = await prisma.subTopics.findUnique({
      where: {
        id: subTopicId,
      },
    });

    if (!subTopic) {
      throw new AppError("SubTopic not found", 404);
    }
    const deletedSubTopic = await prisma.subTopics.delete({
      where: {
        id: subTopicId,
      },
    });
    res.status(200).json({
      message: "Syllabus deleted successfully by id ",
      deletedSubTopic,
    });
  },
);

export const editSyllabusName = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError("unAuthenticated", 401);
    }
    const syllabusId = Array.isArray(req.params.syllabusId)
      ? req.params.syllabusId[0]
      : req.params.syllabusId;
    if (!syllabusId) {
      throw new AppError("Syllabus id not found", 400);
    }

    const { name } = req.body;
    if (!name?.trim()) {
      throw new AppError("Syllabus name is required", 400);
    }
    const syllabus = await prisma.syllabus.update({
      where: {
        id: syllabusId,
      },
      data: {
        name: name.trim(),
      },
    });
    res
      .status(200)
      .json({ message: "Syllabus updated successfully", syllabus });
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
    await tx.subTopics.updateMany({
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
