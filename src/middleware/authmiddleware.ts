import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log("========== AUTH DEBUG ==========");
  console.log("Cookie:", req.headers.cookie);
  console.log("Authorization:", req.headers.authorization);
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = session.user;
  next();
}
