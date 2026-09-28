/*
  Warnings:

  - You are about to drop the column `subjectId` on the `Unit` table. All the data in the column will be lost.
  - You are about to drop the `Subject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Syllabus` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `roadmapId` to the `Unit` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "StudySession" DROP CONSTRAINT "StudySession_syllabusId_fkey";

-- DropForeignKey
ALTER TABLE "Subject" DROP CONSTRAINT "Subject_syllabusId_fkey";

-- DropForeignKey
ALTER TABLE "Syllabus" DROP CONSTRAINT "Syllabus_userId_fkey";

-- DropForeignKey
ALTER TABLE "Unit" DROP CONSTRAINT "Unit_subjectId_fkey";

-- AlterTable
ALTER TABLE "Unit" DROP COLUMN "subjectId",
ADD COLUMN     "roadmapId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Subject";

-- DropTable
DROP TABLE "Syllabus";

-- CreateTable
CREATE TABLE "Roadmap" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isFollowing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Roadmap_userId_idx" ON "Roadmap"("userId");

-- CreateIndex
CREATE INDEX "SubTopics_topicId_idx" ON "SubTopics"("topicId");

-- CreateIndex
CREATE INDEX "Topic_unitId_idx" ON "Topic"("unitId");

-- CreateIndex
CREATE INDEX "Unit_roadmapId_idx" ON "Unit"("roadmapId");

-- AddForeignKey
ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "Roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "Roadmap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
