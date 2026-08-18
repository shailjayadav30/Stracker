import type { FileFilterCallback } from "multer";
import multer from "multer";

import type { Request } from "express";
const storage = multer.memoryStorage();

const filefilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: filefilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
