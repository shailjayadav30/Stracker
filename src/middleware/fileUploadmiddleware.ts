import type { FileFilterCallback } from "multer";
import multer from "multer";

import type { Request } from "express";
import AppError from "../lib/error/appError.js";
import { UPLOAD_LIMITS } from "../config/syllabus.js";
const storage = multer.memoryStorage();

const filefilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new AppError("Only PDF files are allowed", 400));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: filefilter,
  limits: { fileSize: UPLOAD_LIMITS.maxFileBytes },
});

export default upload;

// Profile photos. Vercel rejects request bodies over 4.5 MB, so stay under that.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export const imageUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new AppError("Only JPEG, PNG, WebP or HEIC images are allowed", 400));
  },
  limits: { fileSize: MAX_IMAGE_BYTES },
});
