import { v2 as cloudinary } from "cloudinary";
import { env } from "../env.js";
import { StoredPdfMissingError, type PdfStorage } from "./types.js";

// PDFs are stored as "authenticated" image assets ("pdfs/<hash>", format pdf): never
// public, but Cloudinary can render their pages as images for signed URLs. The original
// PDF is fetched through signed, expiring download URLs.
const ASSET = { resource_type: "image", type: "authenticated" } as const;

// Page images: wide enough to read on a phone; Cloudinary caches each rendered page
const PAGE_WIDTH = 1200;

export function createCloudinaryStorage(): PdfStorage | null {
  if (!env.CLOUDINARY_URL) return null;

  // cloudinary://<api_key>:<api_secret>@<cloud_name>
  const url = new URL(env.CLOUDINARY_URL);
  cloudinary.config({
    cloud_name: url.hostname,
    api_key: decodeURIComponent(url.username),
    api_secret: decodeURIComponent(url.password),
    secure: true,
  });

  const downloadUrl = (publicId: string, ttlSeconds: number) =>
    cloudinary.utils.private_download_url(publicId, "pdf", {
      ...ASSET,
      attachment: false,
      expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
    });

  return {
    name: "cloudinary",

    async store(pdf, pdfHash) {
      const publicId = `pdfs/${pdfHash}`;
      // overwrite: false keeps an identical PDF that's already stored
      await new Promise<void>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { ...ASSET, public_id: publicId, overwrite: false },
            (error) => (error ? reject(toError(error)) : resolve()),
          )
          .end(pdf);
      });
      return publicId;
    },

    async read(publicId) {
      const response = await fetch(downloadUrl(publicId, 60));
      if (response.status === 404) {
        throw new StoredPdfMissingError(`Not found in Cloudinary: ${publicId}`);
      }
      if (!response.ok) {
        throw new Error(`Cloudinary download failed (${response.status}): ${publicId}`);
      }
      return Buffer.from(await response.arrayBuffer());
    },

    async viewUrl(publicId, _fileName, ttlSeconds) {
      return downloadUrl(publicId, ttlSeconds);
    },

    pageImageUrls(publicId, pageCount) {
      return Array.from({ length: pageCount }, (_, i) =>
        cloudinary.url(publicId, {
          ...ASSET,
          sign_url: true,
          format: "jpg",
          transformation: [
            { page: i + 1, width: PAGE_WIDTH, crop: "limit", quality: "auto" },
          ],
        }),
      );
    },
  };
}

// The SDK rejects with plain objects ({ message, http_code }), not Errors
function toError(error: unknown) {
  if (error instanceof Error) return error;
  const e = error as { message?: string; http_code?: number };
  return new Error(`Cloudinary upload failed (${e.http_code ?? "?"}): ${e.message ?? "unknown"}`);
}
