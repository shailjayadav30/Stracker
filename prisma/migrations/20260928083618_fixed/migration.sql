/*
  Warnings:

  - You are about to drop the column `syllabusId` on the `StudySession` table. All the data in the column will be lost.
  - You are about to drop the `SubTopics` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `roadmapId` to the `StudySession` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Roadmap" DROP CONSTRAINT "Roadmap_userId_fkey";

-- DropForeignKey
ALTER TABLE "StudySession" DROP CONSTRAINT "StudySession_syllabusId_fkey";

-- DropForeignKey
ALTER TABLE "StudySession" DROP CONSTRAINT "StudySession_unitId_fkey";

-- DropForeignKey
ALTER TABLE "StudySession" DROP CONSTRAINT "StudySession_userId_fkey";

-- DropForeignKey
ALTER TABLE "SubTopics" DROP CONSTRAINT "SubTopics_topicId_fkey";

-- DropIndex
DROP INDEX "StudySession_syllabusId_idx";

-- AlterTable
ALTER TABLE "StudySession" DROP COLUMN "syllabusId",
ADD COLUMN     "roadmapId" TEXT NOT NULL;

-- DropTable
DROP TABLE "SubTopics";

-- CreateTable
CREATE TABLE "SubTopic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubTopic_topicId_idx" ON "SubTopic"("topicId");

-- CreateIndex
CREATE INDEX "StudySession_roadmapId_idx" ON "StudySession"("roadmapId");

-- AddForeignKey
ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubTopic" ADD CONSTRAINT "SubTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "Roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
