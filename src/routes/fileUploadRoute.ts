import Router from "express";
import upload from "../middleware/fileUploadmiddleware.js";
import { uploadfile } from "../controllers/uploadfilecontroller.js";
import { requireAuth } from "../middleware/authmiddleware.js";
import {
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
router.get("/syllabus", getAllRoadmap);
router.get("/syllabus/:syllabusId", getRoadmapById);
router.patch("/syllabus/:syllabusId", editSyllabusName);
router.patch("/subjects/:subjectId", editSubjectName);
router.patch("/units/:unitId", editUnitName);
router.patch("/topics/:topicId", editTopicName);
router.patch("/subTopics/:subtopicId", editSubTopicName);
router.delete("/syllabus/:syllabusId", deleteRoadmapById);
router.delete("/subjects/:subjectId", deleteSubjectById);
router.delete("/units/:unitId", deleteUnitById);
router.delete("/topics/:topicId", deleteTopicById);
router.delete("/subTopics/:subtopicId", deleteSubTopicById);

export default router;
