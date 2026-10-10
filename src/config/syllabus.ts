import { env } from "../lib/env.js";

// Bump whenever a prompt or AI schema changes, so cached analyses from the old prompt aren't reused
export const PROMPT_VERSION = "2026-10-v2";

export const AI_MODELS = {
  // Pass 1 (subject detection) is a simpler task, so it can use a cheaper model
  detect: env.GEMINI_MODEL_DETECT ?? env.GEMINI_MODEL,
  extract: env.GEMINI_MODEL,
} as const;

export const UPLOAD_LIMITS = {
  // Note: Vercel rejects request bodies over 4.5 MB before they reach the app
  maxFileBytes: 10 * 1024 * 1024,
  maxPages: 100,
  // Gemini deletes uploaded files after ~48h; stop using them a little earlier
  retentionHours: 47,
} as const;

export const ANALYZE_LIMITS = {
  // Analyses read the whole PDF (the most expensive call); cache hits don't count
  perUserPerDay: 10,
} as const;

export const GENERATE_LIMITS = {
  maxSubjectsPerRequest: 10,
  // Subjects extracted in parallel within one request
  concurrency: 3,
} as const;
