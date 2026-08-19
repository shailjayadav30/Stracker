import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import { env } from "./lib/env.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import globalErrorHandler from "./middleware/errormiddleware.js"
import fileUpload from "./routes/fileUploadRoute.js"
import AppError from "./lib/error/appError.js";
const app = express();
const PORT = env.PORT;
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()),
    credentials: true,
  }),
);
app.all("/api/auth/*splat",toNodeHandler(auth))
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Working" });
});
app.use("/api",fileUpload)
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});
app.use(globalErrorHandler)
app.listen(PORT, () => {
  console.log(`Server is running on PORT  ${PORT}`);
});
