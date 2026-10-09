import type { NextFunction, Request, Response } from "express";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "../lib/env.js";
import AppError from "../lib/error/appError.js";
import { getUserId } from "./authmiddleware.js";

// Shared across all Vercel instances, unlike express-rate-limit's in-memory store
const ratelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "ratelimit:upload",
});

// Must run after requireAuth
export async function uploadLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { success, limit, remaining, reset } = await ratelimit.limit(
    getUserId(req),
  );
  res.setHeader("RateLimit-Limit", limit);
  res.setHeader("RateLimit-Remaining", remaining);
  if (!success) {
    res.setHeader("Retry-After", Math.ceil((reset - Date.now()) / 1000));
    throw new AppError("Too many uploads, please try again later", 429);
  }
  next();
}
