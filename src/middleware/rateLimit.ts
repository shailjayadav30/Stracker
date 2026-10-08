import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import AppError from "../lib/error/appError.js";

// PDF upload calls the paid Gemini API, so cap it per user (falls back to IP).
// Must run after requireAuth so req.user is set.
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
  handler: (_req, _res, next) => {
    next(new AppError("Too many uploads, please try again later", 429));
  },
});
