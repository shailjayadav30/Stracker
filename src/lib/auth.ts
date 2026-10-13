import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "./env.js";
import prisma from "./db.js";

export const auth = betterAuth({
  plugins: [expo()],
  trustedOrigins: [
    "studyfrontend://",
    ...(env.ALLOW_EXPO_GO
      ? [
          "exp://", // Trust any host of the exp:// scheme
          "exp://**", // Trust all Expo URLs (wildcard matching)
          "exp://192.168.*.*:*/**", // Trust 192.168.x.x IP range with any port and path
        ]
      : []),
  ],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  // "Continue with Google" (OAuth web client). Enabled only when both env vars are set.
  // Google must allow the redirect URI `${BETTER_AUTH_URL}/api/auth/callback/google`.
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            // Always let the user pick an account (students often have several)
            prompt: "select_account",
          },
        }
      : {},
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
});
