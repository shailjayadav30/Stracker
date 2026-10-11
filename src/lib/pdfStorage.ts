import { createCloudinaryStorage } from "./storage/cloudinaryStorage.js";
import { createS3Storage, isMissingObjectError as isMissingS3Object } from "./storage/s3Storage.js";
import { StoredPdfMissingError, type PdfStorage } from "./storage/types.js";

// Permanent PDF storage. PDFs are stored once per content hash, so thousands of students
// uploading the same syllabus share one object.
//
// Providers: S3-compatible (Cloudflare R2, Supabase, B2, AWS; S3_* env vars) and
// Cloudinary (CLOUDINARY_URL). New PDFs go to S3 when it's configured, otherwise to
// Cloudinary. Stored keys record their provider ("cloudinary:pdfs/..." vs "pdfs/..."),
// so PDFs already in Cloudinary stay readable after switching to R2, as long as
// CLOUDINARY_URL is still set.
const providers = {
  s3: createS3Storage(),
  cloudinary: createCloudinaryStorage(),
};
const writeProvider = providers.s3 ?? providers.cloudinary;

if (writeProvider) {
  console.log(`PDF storage: new PDFs are stored in ${writeProvider.name}`);
} else {
  console.warn(
    "PDF storage is not configured: PDFs are only kept in Gemini for ~48h (set S3_* or CLOUDINARY_URL)",
  );
}

const CLOUDINARY_PREFIX = "cloudinary:";

// Which provider a stored key belongs to, and the key as that provider knows it
function resolve(storageKey: string): { provider: PdfStorage | null; key: string } {
  if (storageKey.startsWith(CLOUDINARY_PREFIX)) {
    return {
      provider: providers.cloudinary,
      key: storageKey.slice(CLOUDINARY_PREFIX.length),
    };
  }
  return { provider: providers.s3, key: storageKey };
}

// Whether this stored PDF can be read with the current configuration
export const canReadStoredPdf = (storageKey: string) =>
  resolve(storageKey).provider !== null;

export function isMissingObjectError(error: unknown) {
  return error instanceof StoredPdfMissingError || isMissingS3Object(error);
}

// Returns the key to save on the upload, or null when storage is off or fails (the
// upload still works, just without a permanent copy)
export async function storePdf(pdf: Buffer, pdfHash: string): Promise<string | null> {
  if (!writeProvider) return null;
  try {
    const key = await writeProvider.store(pdf, pdfHash);
    return writeProvider.name === "cloudinary" ? CLOUDINARY_PREFIX + key : key;
  } catch (error) {
    console.error(`Failed to store PDF in ${writeProvider.name}:`, error);
    return null;
  }
}

export async function readPdf(storageKey: string): Promise<Buffer> {
  const { provider, key } = resolve(storageKey);
  if (!provider) throw new Error(`No storage configured for ${storageKey}`);
  return provider.read(key);
}

const VIEW_URL_TTL_SECONDS = 15 * 60;

export async function getPdfViewUrl(storageKey: string, fileName: string) {
  const { provider, key } = resolve(storageKey);
  if (!provider) throw new Error(`No storage configured for ${storageKey}`);
  const safeName = fileName.replace(/["\\\r\n]/g, "_");
  const url = await provider.viewUrl(key, safeName, VIEW_URL_TTL_SECONDS);
  return { url, expiresAt: new Date(Date.now() + VIEW_URL_TTL_SECONDS * 1000) };
}

// Page images for showing the PDF in the app; null when the provider can't render pages
export function getPdfPageImages(storageKey: string, pageCount: number) {
  const { provider, key } = resolve(storageKey);
  return provider?.pageImageUrls?.(key, pageCount) ?? null;
}
