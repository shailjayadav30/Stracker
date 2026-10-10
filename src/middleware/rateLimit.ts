import type { NextFunction, Request, Response } from "express";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "../lib/env.js";
import AppError from "../lib/error/appError.js";
import { getUserId } from "./authmiddleware.js";
import { ANALYZE_LIMITS } from "../config/syllabus.js";

// Shared across all Vercel instances, unlike express-rate-limit's in-memory store
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

// Roadmap generations (each one is a paid Gemini call): legacy uploads and generated subjects
const generationRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "ratelimit:upload",
});

// Subject detection reads the whole PDF, so it has its own daily budget
const analyzeRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(ANALYZE_LIMITS.perUserPerDay, "1 d"),
  prefix: "ratelimit:analyze",
});

async function consume(
  ratelimit: Ratelimit,
  userId: string,
  cost: number,
  message: string,
  res?: Response,
) {
  const { success, limit, remaining, reset } = await ratelimit.limit(userId, {
    rate: cost,
  });
  res?.setHeader("RateLimit-Limit", limit);
  res?.setHeader("RateLimit-Remaining", remaining);
  if (!success) {
    res?.setHeader("Retry-After", Math.ceil((reset - Date.now()) / 1000));
    throw new AppError(message, 429);
  }
}

// Must run after requireAuth
export async function uploadLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  await consume(
    generationRatelimit,
    getUserId(req),
    1,
    "Too many uploads, please try again later",
    res,
  );
  next();
}

// One unit per subject being generated
export async function consumeGenerationQuota(
  userId: string,
  subjects: number,
  res: Response,
) {
  await consume(
    generationRatelimit,
    userId,
    subjects,
    "Too many roadmaps generated recently, please try again later",
    res,
  );
}

export async function consumeAnalyzeQuota(userId: string, res: Response) {
  await consume(
    analyzeRatelimit,
    userId,
    1,
    "Too many syllabus analyses today, please try again tomorrow",
    res,
  );
}
