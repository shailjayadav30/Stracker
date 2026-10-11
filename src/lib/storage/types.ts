// One place PDFs can be kept permanently. Keys are what `store` returns, without the
// "<provider>:" prefix pdfStorage.ts adds for non-S3 providers.
export type PdfStorage = {
  name: "s3" | "cloudinary";
  // Store the PDF unless an identical one (same hash) is already stored; returns its key
  store(pdf: Buffer, pdfHash: string): Promise<string>;
  read(key: string): Promise<Buffer>;
  // Short-lived link for viewing the PDF; the storage itself stays private
  viewUrl(key: string, fileName: string, ttlSeconds: number): Promise<string>;
  // One image per page for showing the PDF in the app (providers that can render pages)
  pageImageUrls?(key: string, pageCount: number): string[];
};

// Thrown by read() when the stored PDF no longer exists
export class StoredPdfMissingError extends Error {
  override name = "NotFound";
}
