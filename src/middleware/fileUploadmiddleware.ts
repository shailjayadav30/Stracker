import type { FileFilterCallback } from "multer";
import multer from "multer";

import type { Request } from "express";
import AppError from "../lib/error/appError.js";
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
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
