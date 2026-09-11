import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "./env.js";
import prisma from "./db.js";

// const prisma = new PrismaClient();
export const auth = betterAuth({
  plugins: [expo()],
  trustedOrigins: [
    "studyfrontend://",
    ...(env.ALLOW_EXPO_GO === "true"
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
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  // socialProviders: {
  //   google: {
  //     clientId: env.GOOGLE_CLIENT_ID ,
  //     clientSecret: env.GOOGLE_CLIENT_SECRET ,
  //   },
  // },
});
