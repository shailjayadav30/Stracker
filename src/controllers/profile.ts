import type { Request, Response } from "express";
import AppError from "../lib/error/appError.js";
import prisma from "../lib/db.js";
import { getUserId } from "../middleware/authmiddleware.js";
import { deleteAvatar, uploadAvatar } from "../lib/storage/avatarStorage.js";
import { profileBodySchema } from "../validationSchema/requestSchemas.js";

const profileFields = { id: true, name: true, email: true, image: true } as const;

// PATCH /api/profile { name }: change the display name
export const updateProfile = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { name } = profileBodySchema.parse(req.body);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: profileFields,
  });

  res.status(200).json({ user });
};

// POST /api/profile/avatar (multipart "avatar"): upload a new profile photo
export const uploadProfileAvatar = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!req.file) {
    throw new AppError("Choose an image to upload", 400);
  }

  const image = await uploadAvatar(userId, req.file.buffer);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { image },
    select: profileFields,
  });

  res.status(200).json({ user });
};

// DELETE /api/profile/avatar: remove the profile photo
export const deleteProfileAvatar = async (req: Request, res: Response) => {
  const userId = getUserId(req);

  // A photo from Google sign-in isn't in Cloudinary; only ours needs deleting
  const current = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { image: true },
  });
  if (current.image?.includes(`/avatars/${userId}`)) {
    await deleteAvatar(userId);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { image: null },
    select: profileFields,
  });

  res.status(200).json({ user });
};
