import { Router } from "express";
import upload from "../middleware/fileUploadmiddleware.js";
import { requireAuth } from "../middleware/authmiddleware.js";
import { analyze, generate, getUploadPdf } from "../controllers/syllabus.js";
import {
  createSpace,
  deleteSpace,
  getSpaceById,
  getSpaces,
  renameSpace,
} from "../controllers/space.js";

const router = Router();

// Analyze (into a space) -> pick -> generate. Rate limits are applied inside (cache hits are free).
router.post("/syllabus/analyze", requireAuth, upload.single("pdffile"), analyze);
router.post("/syllabus/:uploadId/roadmaps", requireAuth, generate);
router.get("/syllabus/uploads/:uploadId/pdf", requireAuth, getUploadPdf);

router.get("/spaces", requireAuth, getSpaces);
router.post("/spaces", requireAuth, createSpace);
router.get("/spaces/:spaceId", requireAuth, getSpaceById);
router.patch("/spaces/:spaceId", requireAuth, renameSpace);
router.delete("/spaces/:spaceId", requireAuth, deleteSpace);

export default router;
