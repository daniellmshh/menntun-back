-- Safe additive migration generated from `prisma migrate diff` against Supabase.
-- Intentionally excludes pre-existing CargoEstado, CURP, timestamp/default and legacy FK drift.

CREATE TYPE "EvaluationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
CREATE TYPE "EvaluationScoreStatus" AS ENUM ('PENDING', 'GRADED', 'EXEMPT', 'MISSING');
CREATE TYPE "EvaluationCalculationMode" AS ENUM ('WEIGHTED_CATEGORIES', 'AVERAGE');

CREATE TABLE "evaluation_categories" (
  "id" TEXT NOT NULL, "school_id" TEXT NOT NULL, "name" TEXT NOT NULL,
  "description" TEXT, "default_weight" DECIMAL(5,2), "active" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "evaluation_categories_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "grading_policies" (
  "id" TEXT NOT NULL, "school_id" TEXT NOT NULL, "group_id" TEXT NOT NULL, "subject_id" TEXT NOT NULL,
  "period_id" TEXT NOT NULL, "calculation_mode" "EvaluationCalculationMode" NOT NULL DEFAULT 'WEIGHTED_CATEGORIES',
  "scale_max" DECIMAL(5,2) NOT NULL DEFAULT 10, "passing_score" DECIMAL(5,2) NOT NULL DEFAULT 6,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "grading_policies_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "grading_policy_weights" (
  "id" TEXT NOT NULL, "policy_id" TEXT NOT NULL, "category_id" TEXT NOT NULL, "weight" DECIMAL(5,2) NOT NULL,
  CONSTRAINT "grading_policy_weights_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "evaluations" (
  "id" TEXT NOT NULL, "school_id" TEXT NOT NULL, "group_id" TEXT NOT NULL, "subject_id" TEXT NOT NULL,
  "period_id" TEXT NOT NULL, "category_id" TEXT NOT NULL, "teacher_profile_id" TEXT NOT NULL, "title" TEXT NOT NULL,
  "description" TEXT, "evaluation_date" DATE NOT NULL, "max_score" DECIMAL(5,2) NOT NULL DEFAULT 10,
  "status" "EvaluationStatus" NOT NULL DEFAULT 'DRAFT', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "evaluation_scores" (
  "id" TEXT NOT NULL, "evaluation_id" TEXT NOT NULL, "student_profile_id" TEXT NOT NULL, "score" DECIMAL(5,2),
  "status" "EvaluationScoreStatus" NOT NULL DEFAULT 'PENDING', "feedback" TEXT, "graded_at" TIMESTAMP(3),
  "graded_by_teacher_profile_id" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "evaluation_scores_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "evaluation_categories_school_id_active_order_idx" ON "evaluation_categories"("school_id", "active", "order");
CREATE UNIQUE INDEX "evaluation_categories_school_id_name_key" ON "evaluation_categories"("school_id", "name");
CREATE INDEX "grading_policies_school_id_period_id_idx" ON "grading_policies"("school_id", "period_id");
CREATE UNIQUE INDEX "grading_policies_group_id_subject_id_period_id_key" ON "grading_policies"("group_id", "subject_id", "period_id");
CREATE UNIQUE INDEX "grading_policy_weights_policy_id_category_id_key" ON "grading_policy_weights"("policy_id", "category_id");
CREATE INDEX "evaluations_school_id_group_id_period_id_idx" ON "evaluations"("school_id", "group_id", "period_id");
CREATE INDEX "evaluations_group_id_subject_id_period_id_idx" ON "evaluations"("group_id", "subject_id", "period_id");
CREATE INDEX "evaluation_scores_student_profile_id_idx" ON "evaluation_scores"("student_profile_id");
CREATE UNIQUE INDEX "evaluation_scores_evaluation_id_student_profile_id_key" ON "evaluation_scores"("evaluation_id", "student_profile_id");

ALTER TABLE "evaluation_categories" ADD CONSTRAINT "evaluation_categories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grading_policies" ADD CONSTRAINT "grading_policies_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grading_policies" ADD CONSTRAINT "grading_policies_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grading_policies" ADD CONSTRAINT "grading_policies_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grading_policies" ADD CONSTRAINT "grading_policies_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grading_policy_weights" ADD CONSTRAINT "grading_policy_weights_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "grading_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grading_policy_weights" ADD CONSTRAINT "grading_policy_weights_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "evaluation_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "evaluation_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_teacher_profile_id_fkey" FOREIGN KEY ("teacher_profile_id") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_graded_by_teacher_profile_id_fkey" FOREIGN KEY ("graded_by_teacher_profile_id") REFERENCES "teacher_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
