-- Additive academic closure metadata. Existing policies and evaluations remain unchanged.
ALTER TABLE "grading_policies"
  ADD COLUMN "closed_at" TIMESTAMP(3),
  ADD COLUMN "final_snapshots" JSONB;
