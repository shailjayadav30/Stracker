import type { ErrorRequestHandler, Response } from "express";
import { env } from "../lib/env.js";
import AppError from "../lib/error/appError.js";

const sendeErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorPro = (err: AppError, res: Response) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("ERROR :", err); // Log it for your internal debugging
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  if (env.NODE_ENV === "development") {
    sendeErrorDev(err, res);
  } else {
    sendErrorPro(err, res);
  }
};

export default globalErrorHandler;
