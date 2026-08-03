-- Additive release features for attendance notifications, push subscriptions and private pickup photos.
CREATE TYPE "AttendanceNotificationType" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'EARLY_RELEASE');
CREATE TYPE "AttendanceNotificationChannel" AS ENUM ('EMAIL', 'PUSH');
CREATE TYPE "AttendanceNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "student_pickup_contacts" ADD COLUMN "photo_path" TEXT;

CREATE TABLE "push_subscriptions" (
  "id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL, "auth" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "attendance_notifications" (
  "id" TEXT NOT NULL, "school_id" TEXT NOT NULL, "event_id" TEXT NOT NULL, "recipient_id" TEXT NOT NULL,
  "type" "AttendanceNotificationType" NOT NULL, "channel" "AttendanceNotificationChannel" NOT NULL,
  "status" "AttendanceNotificationStatus" NOT NULL DEFAULT 'PENDING', "sent_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3), "error" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_notifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_user_id_active_idx" ON "push_subscriptions"("user_id", "active");
CREATE UNIQUE INDEX "attendance_notifications_event_recipient_channel_key" ON "attendance_notifications"("event_id", "recipient_id", "channel");
CREATE INDEX "attendance_notifications_school_id_created_at_idx" ON "attendance_notifications"("school_id", "created_at");
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_notifications" ADD CONSTRAINT "attendance_notifications_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_notifications" ADD CONSTRAINT "attendance_notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "attendance_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_notifications" ADD CONSTRAINT "attendance_notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
