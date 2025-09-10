-- Create Enum for ContentType
DO $$ BEGIN
  CREATE TYPE "ContentType" AS ENUM ('TEXT', 'HTML', 'VIDEO', 'FILE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create Table Lesson
CREATE TABLE IF NOT EXISTS "Lesson" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "classId" TEXT NULL,
  "subjectId" TEXT NULL,
  "title" TEXT NOT NULL,
  "contentType" "ContentType" NOT NULL,
  "body" TEXT NULL,
  "fileId" TEXT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "publishedAt" TIMESTAMP NULL,
  CONSTRAINT "Lesson_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Lesson_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Lesson_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Lesson_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Lesson_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Lesson_schoolId_idx" ON "Lesson" ("schoolId");

