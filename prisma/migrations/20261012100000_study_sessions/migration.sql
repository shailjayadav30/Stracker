-- Study sessions become a stopwatch on a roadmap (the old countdown-per-unit columns
-- were never used; the table was empty), plus the topics/subtopics ticked during a session.
-- Sessions outlive their roadmap (roadmapId SET NULL) so past days keep counting for streaks.

-- CreateEnum
CREATE TYPE "StudyItemKind" AS ENUM ('TOPIC', 'SUBTOPIC');

-- DropForeignKey
ALTER TABLE "StudySession" DROP CONSTRAINT "StudySession_roadmapId_fkey";

-- DropForeignKey
ALTER TABLE "StudySession" DROP CONSTRAINT "StudySession_unitId_fkey";

-- DropIndex
DROP INDEX "StudySession_unitId_idx";

-- DropIndex
DROP INDEX "StudySession_userId_idx";

-- DropIndex
DROP INDEX "StudySession_userId_startedAt_idx";

-- AlterTable
ALTER TABLE "StudySession" DROP COLUMN "duration",
DROP COLUMN "plannedDuration",
DROP COLUMN "remainingDuration",
DROP COLUMN "unitId",
ADD COLUMN     "activeSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "endedOnDay" TEXT,
ADD COLUMN     "resumedAt" TIMESTAMP(3),
ADD COLUMN     "roadmapName" TEXT NOT NULL,
ALTER COLUMN "startedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "roadmapId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "StudySessionItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "kind" "StudyItemKind" NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySessionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudySessionItem_sessionId_kind_itemId_key" ON "StudySessionItem"("sessionId", "kind", "itemId");

-- CreateIndex
CREATE INDEX "StudySession_userId_status_idx" ON "StudySession"("userId", "status");

-- CreateIndex
CREATE INDEX "StudySession_userId_endedOnDay_idx" ON "StudySession"("userId", "endedOnDay");

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "Roadmap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySessionItem" ADD CONSTRAINT "StudySessionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
