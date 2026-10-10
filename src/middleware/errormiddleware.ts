import type { ErrorRequestHandler, Response } from "express";
import { ZodError, z } from "zod";
import multer from "multer";
import { env } from "../lib/env.js";
import AppError from "../lib/error/appError.js";
import { Prisma } from "../generated/prisma/client.js";
import { UPLOAD_LIMITS } from "../config/syllabus.js";

// Turn known library errors into AppErrors with the right status code
function normalizeError(err: unknown): unknown {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    return new AppError(z.prettifyError(err), 400);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2025: update/delete matched no record (missing id or not owned by the user)
    if (err.code === "P2025") {
      const model = err.meta?.modelName;
      return new AppError(
        `${typeof model === "string" ? model : "Record"} not found`,
        404,
      );
    }
    if (err.code === "P2002") return new AppError("Record already exists", 409);
    if (err.code === "P2003") return new AppError("Related record not found", 400);
  }

  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    return new AppError(
      tooLarge
        ? `File is too large (max ${UPLOAD_LIMITS.maxFileBytes / (1024 * 1024)} MB)`
        : err.message,
      tooLarge ? 413 : 400,
    );
  }

  // http-errors from body-parser etc. (malformed JSON, payload too large)
  if (
    err instanceof Error &&
    "expose" in err &&
    err.expose === true &&
    "status" in err &&
    typeof err.status === "number"
  ) {
    return new AppError(err.message, err.status);
  }

  return err;
}

const sendErrorDev = (err: unknown, statusCode: number, res: Response) => {
  const error = err instanceof Error ? err : new Error(String(err));
  res.status(statusCode).json({
    status: err instanceof AppError ? err.status : "error",
    message: error.message,
    stack: error.stack,
  });
};

const sendErrorProd = (err: unknown, statusCode: number, res: Response) => {
  if (err instanceof AppError) {
    res.status(statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const error = normalizeError(err);
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  if (statusCode >= 500) {
    console.error(`ERROR ${req.method} ${req.originalUrl}:`, error);
  }

  if (env.NODE_ENV === "development") {
    sendErrorDev(error, statusCode, res);
  } else {
    sendErrorProd(error, statusCode, res);
  }
};

export default globalErrorHandler;
