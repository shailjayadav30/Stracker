-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SCHOOL', 'COLLEGE', 'COMPETITIVE_EXAM', 'PROFESSIONAL', 'OTHER');

-- AlterTable
ALTER TABLE "Roadmap" ADD COLUMN     "documentType" "DocumentType",
ADD COLUMN     "examGroupId" TEXT,
ADD COLUMN     "examOrBoard" TEXT,
ADD COLUMN     "promptVersion" TEXT,
ADD COLUMN     "subjectGroup" TEXT;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "sourceLabel" TEXT;

-- CreateTable
CREATE TABLE "SyllabusUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pdfHash" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "fileName" TEXT,
    "geminiFileName" TEXT,
    "geminiFileUri" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "analysisId" TEXT,
    "analysisFromCache" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyllabusUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusAnalysis" (
    "id" TEXT NOT NULL,
    "pdfHash" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "isSyllabus" BOOLEAN NOT NULL,
    "documentType" "DocumentType",
    "examOrBoard" TEXT,
    "language" TEXT,
    "subjectsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyllabusAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "examOrBoard" TEXT,
    "uploadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyllabusUpload_userId_createdAt_idx" ON "SyllabusUpload"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SyllabusUpload_expiresAt_idx" ON "SyllabusUpload"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyllabusAnalysis_pdfHash_promptVersion_model_key" ON "SyllabusAnalysis"("pdfHash", "promptVersion", "model");

-- CreateIndex
CREATE UNIQUE INDEX "ExamGroup_uploadId_key" ON "ExamGroup"("uploadId");

-- CreateIndex
CREATE INDEX "ExamGroup_userId_idx" ON "ExamGroup"("userId");

-- CreateIndex
CREATE INDEX "Roadmap_examGroupId_idx" ON "Roadmap"("examGroupId");

-- AddForeignKey
ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_examGroupId_fkey" FOREIGN KEY ("examGroupId") REFERENCES "ExamGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusUpload" ADD CONSTRAINT "SyllabusUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusUpload" ADD CONSTRAINT "SyllabusUpload_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "SyllabusAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamGroup" ADD CONSTRAINT "ExamGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamGroup" ADD CONSTRAINT "ExamGroup_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "SyllabusUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

