import Router from "express";
import upload from "../middleware/fileUploadmiddleware.js";
import { uploadfile } from "../controllers/uploadfilecontroller.js";
// import { requireAuth } from "../middleware/authmiddleware.js";

const router = Router();

router.post("/uploadfile", upload.single("pdffile"), uploadfile);

export default router;
