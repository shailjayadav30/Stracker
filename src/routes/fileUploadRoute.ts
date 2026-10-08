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

router.post("/uploadfile", requireAuth, upload.single("pdffile"), uploadfile); //done
router.get("/roadmap", requireAuth, getAllRoadmap); //done
router.get("/roadmap/isfollowing", requireAuth, getFollowingRoadMaps); //done
router.get("/roadmap/:roadmapId", requireAuth, getRoadmapById); //done
router.patch("/roadmap/:roadmapId", requireAuth, editRoadmapName);
router.patch("/units/:unitId", requireAuth, editUnitName);
router.patch("/topics/:topicId", requireAuth, editTopicName);
router.patch("/subTopics/:subtopicId", requireAuth, editSubTopicName);
router.delete("/roadmap/:roadmapId", requireAuth, deleteRoadmapById); //done
router.delete("/units/:unitId", requireAuth, deleteUnitById);  //done
router.delete("/topics/:topicId", requireAuth, deleteTopicById); //done
router.delete("/subTopics/:subTopicId", requireAuth, deleteSubTopicById); //done
router.patch("/topics/:topicId/complete", requireAuth, completeTopic);
router.patch("/roadmap/isfollowing/:roadmapId", requireAuth, followingRoadmap);

export default router;
