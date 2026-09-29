import Router from "express";
import upload from "../middleware/fileUploadmiddleware.js";
import { uploadfile } from "../controllers/uploadfilecontroller.js";
import { requireAuth } from "../middleware/authmiddleware.js";
import {
  completeTopic,
  deleteRoadmapById,
  deleteSubTopicById,
  deleteTopicById,
  deleteUnitById,
  editSubTopicName,
  editRoadmapName,
  editTopicName,
  editUnitName,
  followingRoadmap,
  getAllRoadmap,
  getRoadmapById,
  getFollowingRoadMaps,
} from "../controllers/roadmap.js";

const router = Router();

router.post("/uploadfile", requireAuth, upload.single("pdffile"), uploadfile);
router.get("/roadmap", requireAuth, getAllRoadmap);
router.get("/roadmap/isfollowing", requireAuth, getFollowingRoadMaps);
router.get("/roadmap/:roadmapId", requireAuth, getRoadmapById);
router.patch("/roadmap/:roadmapId", requireAuth, editRoadmapName);
router.patch("/units/:unitId", requireAuth, editUnitName);
router.patch("/topics/:topicId", requireAuth, editTopicName);
router.patch("/subTopics/:subtopicId", requireAuth, editSubTopicName);
router.delete("/roadmap/:roadmapId", requireAuth, deleteRoadmapById);
router.delete("/units/:unitId", requireAuth, deleteUnitById);
router.delete("/topics/:topicId", requireAuth, deleteTopicById);
router.delete("/subTopics/:subtopicId", requireAuth, deleteSubTopicById);
router.patch("/topics/:topicId/complete", requireAuth, completeTopic);
router.patch("/roadmap/isfollowing/:roadmapId", requireAuth, followingRoadmap);

export default router;
