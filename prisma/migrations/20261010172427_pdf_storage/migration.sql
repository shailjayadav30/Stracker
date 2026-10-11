-- AlterTable
ALTER TABLE "Roadmap" ADD COLUMN     "uploadId" TEXT;

-- AlterTable
ALTER TABLE "SyllabusUpload" ADD COLUMN     "storageKey" TEXT;

-- CreateIndex
CREATE INDEX "Roadmap_uploadId_idx" ON "Roadmap"("uploadId");

-- AddForeignKey
ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "SyllabusUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

