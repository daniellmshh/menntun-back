-- A class attendance session can represent either a subject lesson or a general
-- homeroom roll call. session_key keeps both forms idempotent per teacher/day/block.
ALTER TABLE "class_attendance_sessions"
  ADD COLUMN "session_key" TEXT NOT NULL DEFAULT 'legacy';

UPDATE "class_attendance_sessions"
SET "session_key" = 'subject:' || "subject_id";

ALTER TABLE "class_attendance_sessions"
  ALTER COLUMN "subject_id" DROP NOT NULL;

DROP INDEX "class_attendance_sessions_group_subject_teacher_date_block_key";

CREATE UNIQUE INDEX "class_attendance_sessions_group_teacher_date_block_key"
  ON "class_attendance_sessions"("group_id", "teacher_profile_id", "local_date", "block_label", "session_key");
