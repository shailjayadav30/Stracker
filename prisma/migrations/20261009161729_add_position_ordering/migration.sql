-- DropIndex
DROP INDEX "Unit_roadmapId_idx";

-- DropIndex
DROP INDEX "Topic_unitId_idx";

-- DropIndex
DROP INDEX "SubTopic_topicId_idx";

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SubTopic" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Unit_roadmapId_position_idx" ON "Unit"("roadmapId", "position");

-- CreateIndex
CREATE INDEX "Topic_unitId_position_idx" ON "Topic"("unitId", "position");

-- CreateIndex
CREATE INDEX "SubTopic_topicId_position_idx" ON "SubTopic"("topicId", "position");


-- Backfill: number existing rows within each parent by creation order (id breaks ties,
-- since rows created in one nested write can share the same createdAt).
UPDATE "Unit" AS u
SET "position" = o.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "roadmapId" ORDER BY "createdAt", "id") - 1 AS rn
  FROM "Unit"
) AS o
WHERE u."id" = o."id";

UPDATE "Topic" AS t
SET "position" = o.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "unitId" ORDER BY "createdAt", "id") - 1 AS rn
  FROM "Topic"
) AS o
WHERE t."id" = o."id";

UPDATE "SubTopic" AS s
SET "position" = o.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "topicId" ORDER BY "createdAt", "id") - 1 AS rn
  FROM "SubTopic"
) AS o
WHERE s."id" = o."id";
