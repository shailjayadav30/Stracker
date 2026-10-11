-- Exam groups become user-named spaces. Every roadmap belongs to exactly one space,
-- and syllabus uploads remember the space they were uploaded into.

-- 1. Rename ExamGroup -> Space (keeps ids, names and roadmaps' links)
ALTER TABLE "ExamGroup" RENAME TO "Space";
ALTER TABLE "Space" RENAME CONSTRAINT "ExamGroup_pkey" TO "Space_pkey";
ALTER TABLE "Space" RENAME CONSTRAINT "ExamGroup_userId_fkey" TO "Space_userId_fkey";
ALTER INDEX "ExamGroup_userId_idx" RENAME TO "Space_userId_idx";

-- 2. Uploads point at their space (from the group's upload, or a roadmap generated from it)
ALTER TABLE "SyllabusUpload" ADD COLUMN "spaceId" TEXT;

UPDATE "SyllabusUpload" u
SET "spaceId" = s."id"
FROM "Space" s
WHERE s."uploadId" = u."id";

UPDATE "SyllabusUpload" u
SET "spaceId" = r."examGroupId"
FROM "Roadmap" r
WHERE r."uploadId" = u."id"
  AND r."examGroupId" IS NOT NULL
  AND u."spaceId" IS NULL;

-- 3. Space no longer tracks a single upload or exam name
ALTER TABLE "Space" DROP CONSTRAINT "ExamGroup_uploadId_fkey";
DROP INDEX "ExamGroup_uploadId_key";
ALTER TABLE "Space" DROP COLUMN "uploadId";
ALTER TABLE "Space" DROP COLUMN "examOrBoard";

-- 4. Roadmap.examGroupId -> spaceId
ALTER TABLE "Roadmap" DROP CONSTRAINT "Roadmap_examGroupId_fkey";
ALTER TABLE "Roadmap" RENAME COLUMN "examGroupId" TO "spaceId";
ALTER INDEX "Roadmap_examGroupId_idx" RENAME TO "Roadmap_spaceId_idx";

-- 5. Roadmaps without a group go into a new "My roadmaps" space per user
WITH created AS (
  INSERT INTO "Space" ("id", "userId", "name", "createdAt", "updatedAt")
  SELECT gen_random_uuid()::text, r."userId", 'My roadmaps', NOW(), NOW()
  FROM "Roadmap" r
  WHERE r."spaceId" IS NULL
  GROUP BY r."userId"
  RETURNING "id", "userId"
)
UPDATE "Roadmap" r
SET "spaceId" = c."id"
FROM created c
WHERE r."spaceId" IS NULL
  AND r."userId" = c."userId";

ALTER TABLE "Roadmap" ALTER COLUMN "spaceId" SET NOT NULL;

-- 6. Foreign keys and index
ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "SyllabusUpload_spaceId_idx" ON "SyllabusUpload"("spaceId");
ALTER TABLE "SyllabusUpload" ADD CONSTRAINT "SyllabusUpload_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;
