import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";
import type { PdfStorage } from "./types.js";

// Private S3-compatible bucket: Cloudflare R2, Supabase Storage, Backblaze B2 or AWS S3.
// Keys are plain ("pdfs/<hash>.pdf").
export function createS3Storage(): PdfStorage | null {
  if (
    !env.S3_ENDPOINT ||
    !env.S3_REGION ||
    !env.S3_ACCESS_KEY_ID ||
    !env.S3_SECRET_ACCESS_KEY ||
    !env.S3_BUCKET
  ) {
    return null;
  }
  const bucket = env.S3_BUCKET;
  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

  return {
    name: "s3",

    async store(pdf, pdfHash) {
      const key = `pdfs/${pdfHash}.pdf`;
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return key; // identical PDF already stored
      } catch (error) {
        if (!isMissingObjectError(error)) throw error;
      }
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: pdf,
          ContentType: "application/pdf",
        }),
      );
      return key;
    },

    async read(key) {
      const object = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      if (!object.Body) throw new Error(`Empty stored object: ${key}`);
      return Buffer.from(await object.Body.transformToByteArray());
    },

    viewUrl(key, fileName, ttlSeconds) {
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
          ResponseContentType: "application/pdf",
          ResponseContentDisposition: `inline; filename="${fileName}"`,
        }),
        { expiresIn: ttlSeconds },
      );
    },
  };
}

// Missing objects come back as NotFound (HEAD) or NoSuchKey (GET), depending on the provider
export function isMissingObjectError(error: unknown) {
  const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e?.name === "NotFound" ||
    e?.name === "NoSuchKey" ||
    e?.$metadata?.httpStatusCode === 404
  );
}
