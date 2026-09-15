import Router from "express";
import upload from "../middleware/fileUploadmiddleware.js";
import { uploadfile } from "../controllers/uploadfilecontroller.js";
import { requireAuth } from "../middleware/authmiddleware.js";
import {
  completeTopic,
  deleteRoadmapById,
  deleteSubjectById,
  deleteSubTopicById,
  deleteTopicById,
  deleteUnitById,
  editSubjectName,
  editSubTopicName,
  editSyllabusName,
  editTopicName,
  editUnitName,
  getAllRoadmap,
  getRoadmapById,
} from "../controllers/roadmap.js";

const router = Router();

router.post("/uploadfile", requireAuth, upload.single("pdffile"), uploadfile);
router.get("/syllabus", requireAuth, getAllRoadmap);
router.get("/syllabus/:syllabusId", requireAuth, getRoadmapById);
router.patch("/syllabus/:syllabusId", requireAuth, editSyllabusName);
router.patch("/subjects/:subjectId", requireAuth, editSubjectName);
router.patch("/units/:unitId", requireAuth, editUnitName);
router.patch("/topics/:topicId", requireAuth, editTopicName);
router.patch("/subTopics/:subtopicId", requireAuth, editSubTopicName);
router.delete("/syllabus/:syllabusId", requireAuth, deleteRoadmapById);
router.delete("/subjects/:subjectId", requireAuth, deleteSubjectById);
router.delete("/units/:unitId", requireAuth, deleteUnitById);
router.delete("/topics/:topicId", requireAuth, deleteTopicById);
router.delete("/subTopics/:subtopicId", requireAuth, deleteSubTopicById);
router.patch("/topics/:topicId/complete", requireAuth, completeTopic);
export default router;
