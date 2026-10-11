import { Router } from "express";
import { requireAuth } from "../middleware/authmiddleware.js";
import { imageUpload } from "../middleware/fileUploadmiddleware.js";
import {
  deleteProfileAvatar,
  updateProfile,
  uploadProfileAvatar,
} from "../controllers/profile.js";

const router = Router();

router.patch("/profile", requireAuth, updateProfile);
router.post("/profile/avatar", requireAuth, imageUpload.single("avatar"), uploadProfileAvatar);
router.delete("/profile/avatar", requireAuth, deleteProfileAvatar);

export default router;
