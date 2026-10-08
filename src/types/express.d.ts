import type { auth } from "../lib/auth.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: typeof auth.$Infer.Session.user;
  }
}
