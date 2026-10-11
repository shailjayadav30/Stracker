import "dotenv/config";
import z from "zod";

const envSchema = z.object({
  // Defaults to production so error details (stack traces) are only sent when explicitly opted in
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("production"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),
  // Optional cheaper model for subject detection (pass 1); defaults to GEMINI_MODEL
  GEMINI_MODEL_DETECT: z.string().min(1).optional(),
  JWT_SECRET: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  ALLOW_EXPO_GO: z.stringbool().default(false),
  UPSTASH_REDIS_REST_URL: z.url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  // Permanent PDF storage in any S3-compatible bucket (Supabase Storage, Backblaze B2,
  // AWS S3, Cloudflare R2). All five or none; without them, PDFs are only kept in
  // Gemini for ~48h and generating later needs a re-upload.
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  // Path-style URLs (endpoint/bucket/key); Supabase needs them and the others accept them
  S3_FORCE_PATH_STYLE: z.stringbool().default(true),
  // Cloudinary PDF storage, used when S3 isn't configured: cloudinary://<key>:<secret>@<cloud>
  CLOUDINARY_URL: z
    .string()
    .regex(
      /^cloudinary:\/\/[^:@]+:[^@]+@[^/]+$/,
      "Expected cloudinary://<api_key>:<api_secret>@<cloud_name>",
    )
    .optional(),
}).superRefine((env, ctx) => {
  const s3 = [
    "S3_ENDPOINT",
    "S3_REGION",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "S3_BUCKET",
  ] as const;
  const missing = s3.filter((key) => !env[key]);
  if (missing.length > 0 && missing.length < s3.length) {
    ctx.addIssue({
      code: "custom",
      message: `Set all S3 variables or none; missing: ${missing.join(", ")}`,
    });
  }
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParsed = envSchema.safeParse(env);
  if (!safeParsed.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(safeParsed.error)}`,
    );
  }
  return safeParsed.data;
}

export const env = createEnv(process.env);
