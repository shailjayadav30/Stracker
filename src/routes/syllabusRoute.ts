import { Router } from "express";
import upload from "../middleware/fileUploadmiddleware.js";
import { requireAuth } from "../middleware/authmiddleware.js";
import { analyze, generate } from "../controllers/syllabus.js";
import {
  deleteExamGroup,
  getExamGroupById,
  getExamGroups,
  renameExamGroup,
} from "../controllers/examGroup.js";

const router = Router();

// Analyze -> pick -> generate. Rate limits are applied inside (cache hits are free).
router.post("/syllabus/analyze", requireAuth, upload.single("pdffile"), analyze);
router.post("/syllabus/:uploadId/roadmaps", requireAuth, generate);

router.get("/exam-groups", requireAuth, getExamGroups);
router.get("/exam-groups/:examGroupId", requireAuth, getExamGroupById);
router.patch("/exam-groups/:examGroupId", requireAuth, renameExamGroup);
router.delete("/exam-groups/:examGroupId", requireAuth, deleteExamGroup);

export default router;
