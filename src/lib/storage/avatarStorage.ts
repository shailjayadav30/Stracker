import AppError from "../error/appError.js";
import { cloudinary, configureCloudinary, toCloudinaryError } from "./cloudinaryConfig.js";

// Profile photos: one public image per user ("avatars/<userId>"), replaced on each upload.
// Cloudinary crops it to a square around the face, so the app can show it at any size.
const AVATAR_SIZE = 512;

const publicId = (userId: string) => `avatars/${userId}`;

function assertConfigured() {
  if (!configureCloudinary()) {
    throw new AppError("Profile photos aren't available right now", 503);
  }
}

// Returns the photo's URL; it includes a version, so a new upload gets a new URL
export async function uploadAvatar(userId: string, image: Buffer) {
  assertConfigured();
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: "image",
          public_id: publicId(userId),
          overwrite: true,
          invalidate: true,
          format: "jpg",
          transformation: [
            { width: AVATAR_SIZE, height: AVATAR_SIZE, crop: "fill", gravity: "face" },
            { quality: "auto" },
          ],
        },
        (error, uploaded) =>
          error || !uploaded ? reject(toCloudinaryError(error)) : resolve(uploaded),
      )
      .end(image);
  });
  return result.secure_url;
}

export async function deleteAvatar(userId: string) {
  assertConfigured();
  // "not found" is fine: the user may never have uploaded one
  await cloudinary.uploader
    .destroy(publicId(userId), { resource_type: "image", invalidate: true })
    .catch((error: unknown) => {
      throw toCloudinaryError(error);
    });
}
