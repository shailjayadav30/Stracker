import Router from "express";
import upload from "../middleware/fileUploadmiddleware.js";
import { uploadfile } from "../controllers/uploadfilecontroller.js";
import { requireAuth } from "../middleware/authmiddleware.js";
import {
  editSubjectName,
  editSubTopicName,
  editTopicName,
  editUnitName,
  getAllRoadmap,
  getRoadmapById,
} from "../controllers/roadmap.js";

const router = Router();

router.post("/uploadfile", requireAuth, upload.single("pdffile"), uploadfile);
router.get("/syllabus", getAllRoadmap);
router.get("/syllabus/:syllabusId", getRoadmapById);
router.patch("/subjects/:subjectId", editSubjectName);
router.patch("/units/:unitId", editUnitName);
router.patch("/topics/:topicId", editTopicName);
router.patch("/subTopics/:subtopicId", editSubTopicName);

export default router;
