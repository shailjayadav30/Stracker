import { v2 as cloudinary } from "cloudinary";
import { env } from "../env.js";

// Configures the Cloudinary SDK from CLOUDINARY_URL once; false when it isn't set
let configured: boolean | null = null;

export function configureCloudinary() {
  if (configured !== null) return configured;
  if (!env.CLOUDINARY_URL) return (configured = false);

  // cloudinary://<api_key>:<api_secret>@<cloud_name>
  const url = new URL(env.CLOUDINARY_URL);
  cloudinary.config({
    cloud_name: url.hostname,
    api_key: decodeURIComponent(url.username),
    api_secret: decodeURIComponent(url.password),
    secure: true,
  });
  return (configured = true);
}

// The SDK rejects with plain objects ({ message, http_code }), not Errors
export function toCloudinaryError(error: unknown) {
  if (error instanceof Error) return error;
  const e = error as { message?: string; http_code?: number };
  return new Error(`Cloudinary request failed (${e.http_code ?? "?"}): ${e.message ?? "unknown"}`);
}

export { cloudinary };
