import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./lib/env.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import prisma from "./lib/db.js";
import globalErrorHandler from "./middleware/errormiddleware.js";
import fileUpload from "./routes/fileUploadRoute.js";
import AppError from "./lib/error/appError.js";

const app = express();
const PORT = env.PORT;

// Behind Vercel's proxy: use X-Forwarded-For for req.ip / req.protocol
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()),
    credentials: true,
  }),
);
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Working" });
});

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({ status: "unavailable" });
  }
});

app.use("/api", fileUpload);
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});
app.use(globalErrorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  // Force exit if open connections keep the server alive too long
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
