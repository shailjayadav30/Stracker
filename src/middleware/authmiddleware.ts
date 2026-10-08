import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import AppError from "../lib/error/appError.js";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  req.user = session.user;
  next();
}

// For handlers behind requireAuth: returns the signed-in user's id
export function getUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError("Unauthorized", 401);
  }
  return req.user.id;
}
