import "dotenv/config";
import z from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),
  JWT_SECRET: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  ALLOW_EXPO_GO: z.stringbool().default(false),
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
