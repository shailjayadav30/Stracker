/*
  Warnings:

  - Added the required column `plannedDuration` to the `StudySession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remainingDuration` to the `StudySession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `StudySession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `StudySession` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StudySessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "StudySession" ADD COLUMN     "plannedDuration" INTEGER NOT NULL,
ADD COLUMN     "remainingDuration" INTEGER NOT NULL,
ADD COLUMN     "status" "StudySessionStatus" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "duration" SET DEFAULT 0,
ALTER COLUMN "endedAt" DROP NOT NULL;
