-- Additive attendance event ledger and operational projections.
-- Existing legacy `attendances` records are intentionally preserved.

CREATE TYPE "AttendanceEventType" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'EARLY_RELEASE', 'RE_ENTRY', 'CORRECTION');
CREATE TYPE "AttendanceEventSource" AS ENUM ('QR_SCANNER', 'MANUAL', 'MOBILE_SYNC');
CREATE TYPE "AttendancePresenceState" AS ENUM ('OUTSIDE', 'INSIDE', 'RELEASED');
CREATE TYPE "DailyAttendanceStatus" AS ENUM ('PENDING', 'PRESENT', 'LATE', 'ABSENT', 'EXCUSED');
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ATTENDANCE_OPERATOR';

CREATE TABLE "attendance_settings" (
  "id" TEXT NOT NULL, "school_id" TEXT NOT NULL, "timezone" TEXT NOT NULL DEFAULT 'America/Monterrey',
  "start_time" TEXT NOT NULL DEFAULT '08:00', "late_tolerance_mins" INTEGER NOT NULL DEFAULT 10,
  "daily_close_time" TEXT NOT NULL DEFAULT '18:00', "active_weekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "attendance_credentials" (
  "id" TEXT NOT NULL, "school_id" TEXT NOT NULL, "student_profile_id" TEXT NOT NULL, "secret_hash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "revoked_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "attendance_credentials_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "student_pickup_contacts" (
  "id" TEXT NOT NULL, "school_id" TEXT NOT NULL, "student_profile_id" TEXT NOT NULL, "name" TEXT NOT NULL,
  "relationship" TEXT NOT NULL, "phone" TEXT, "valid_from" DATE, "valid_until" DATE,
  "requires_id_check" BOOLEAN NOT NULL DEFAULT true, "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_pickup_contacts_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "attendance_events" (
  "id" TEXT NOT NULL, "school_id" TEXT NOT NULL, "group_id" TEXT NOT NULL, "student_profile_id" TEXT NOT NULL,
  "credential_id" TEXT, "pickup_contact_id" TEXT, "operator_id" TEXT NOT NULL, "type" "AttendanceEventType" NOT NULL,
  "source" "AttendanceEventSource" NOT NULL, "local_date" DATE NOT NULL, "occurred_at" TIMESTAMP(3) NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "client_event_id" TEXT, "device_id" TEXT,
  "reason" TEXT, "id_verified" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "student_presence_states" (
  "id" TEXT NOT NULL, "school_id" TEXT NOT NULL, "group_id" TEXT NOT NULL, "student_profile_id" TEXT NOT NULL,
  "local_date" DATE NOT NULL, "state" "AttendancePresenceState" NOT NULL DEFAULT 'OUTSIDE', "last_event_id" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "student_presence_states_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "daily_attendance_summaries" (
  "id" TEXT NOT NULL, "school_id" TEXT NOT NULL, "group_id" TEXT NOT NULL, "student_profile_id" TEXT NOT NULL,
  "local_date" DATE NOT NULL, "status" "DailyAttendanceStatus" NOT NULL DEFAULT 'PENDING', "arrived_at" TIMESTAMP(3),
  "departed_at" TIMESTAMP(3), "has_gate_evidence" BOOLEAN NOT NULL DEFAULT false, "has_class_evidence" BOOLEAN NOT NULL DEFAULT false,
  "closed_at" TIMESTAMP(3), "reopened_at" TIMESTAMP(3), "reopen_reason" TEXT, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "daily_attendance_summaries_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "class_attendance_sessions" (
  "id" TEXT NOT NULL, "school_id" TEXT NOT NULL, "group_id" TEXT NOT NULL, "subject_id" TEXT NOT NULL,
  "teacher_profile_id" TEXT NOT NULL, "local_date" DATE NOT NULL, "block_label" TEXT NOT NULL DEFAULT 'general',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "class_attendance_sessions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "class_attendance_records" (
  "id" TEXT NOT NULL, "session_id" TEXT NOT NULL, "student_profile_id" TEXT NOT NULL, "status" "AttendanceStatus" NOT NULL,
  "notes" TEXT, "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "corrected_at" TIMESTAMP(3),
  "correction_reason" TEXT, CONSTRAINT "class_attendance_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_settings_school_id_key" ON "attendance_settings"("school_id");
CREATE UNIQUE INDEX "attendance_credentials_secret_hash_key" ON "attendance_credentials"("secret_hash");
CREATE INDEX "attendance_credentials_school_id_student_profile_id_active_idx" ON "attendance_credentials"("school_id", "student_profile_id", "active");
CREATE INDEX "student_pickup_contacts_school_id_student_profile_id_active_idx" ON "student_pickup_contacts"("school_id", "student_profile_id", "active");
CREATE INDEX "attendance_events_school_id_local_date_occurred_at_idx" ON "attendance_events"("school_id", "local_date", "occurred_at");
CREATE INDEX "attendance_events_student_profile_id_occurred_at_idx" ON "attendance_events"("student_profile_id", "occurred_at");
CREATE UNIQUE INDEX "attendance_events_school_id_client_event_id_key" ON "attendance_events"("school_id", "client_event_id");
CREATE INDEX "student_presence_states_school_id_local_date_state_idx" ON "student_presence_states"("school_id", "local_date", "state");
CREATE UNIQUE INDEX "student_presence_states_school_id_student_profile_id_local_date_key" ON "student_presence_states"("school_id", "student_profile_id", "local_date");
CREATE INDEX "daily_attendance_summaries_school_id_group_id_local_date_status_idx" ON "daily_attendance_summaries"("school_id", "group_id", "local_date", "status");
CREATE UNIQUE INDEX "daily_attendance_summaries_school_id_student_profile_id_local_date_key" ON "daily_attendance_summaries"("school_id", "student_profile_id", "local_date");
CREATE INDEX "class_attendance_sessions_school_id_local_date_idx" ON "class_attendance_sessions"("school_id", "local_date");
CREATE UNIQUE INDEX "class_attendance_sessions_group_subject_teacher_date_block_key" ON "class_attendance_sessions"("group_id", "subject_id", "teacher_profile_id", "local_date", "block_label");
CREATE INDEX "class_attendance_records_student_profile_id_marked_at_idx" ON "class_attendance_records"("student_profile_id", "marked_at");
CREATE UNIQUE INDEX "class_attendance_records_session_id_student_profile_id_key" ON "class_attendance_records"("session_id", "student_profile_id");

ALTER TABLE "attendance_settings" ADD CONSTRAINT "attendance_settings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_credentials" ADD CONSTRAINT "attendance_credentials_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_credentials" ADD CONSTRAINT "attendance_credentials_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_pickup_contacts" ADD CONSTRAINT "student_pickup_contacts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_pickup_contacts" ADD CONSTRAINT "student_pickup_contacts_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "attendance_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_pickup_contact_id_fkey" FOREIGN KEY ("pickup_contact_id") REFERENCES "student_pickup_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_presence_states" ADD CONSTRAINT "student_presence_states_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_presence_states" ADD CONSTRAINT "student_presence_states_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_presence_states" ADD CONSTRAINT "student_presence_states_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_attendance_summaries" ADD CONSTRAINT "daily_attendance_summaries_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_attendance_summaries" ADD CONSTRAINT "daily_attendance_summaries_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_attendance_summaries" ADD CONSTRAINT "daily_attendance_summaries_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_attendance_sessions" ADD CONSTRAINT "class_attendance_sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_attendance_sessions" ADD CONSTRAINT "class_attendance_sessions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_attendance_sessions" ADD CONSTRAINT "class_attendance_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_attendance_sessions" ADD CONSTRAINT "class_attendance_sessions_teacher_profile_id_fkey" FOREIGN KEY ("teacher_profile_id") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_attendance_records" ADD CONSTRAINT "class_attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_attendance_records" ADD CONSTRAINT "class_attendance_records_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
