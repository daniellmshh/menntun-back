-- CreateEnum
CREATE TYPE "NivelEducativo" AS ENUM ('PREESCOLAR', 'PRIMARIA', 'SECUNDARIA');

-- AlterTable (Safely cast level column)
ALTER TABLE "grades" ALTER COLUMN "level" TYPE "NivelEducativo" USING (
  CASE UPPER("level")
    WHEN 'PREESCOLAR' THEN 'PREESCOLAR'::"NivelEducativo"
    WHEN 'PRIMARIA' THEN 'PRIMARIA'::"NivelEducativo"
    WHEN 'SECUNDARIA' THEN 'SECUNDARIA'::"NivelEducativo"
    ELSE NULL
  END
);

-- AlterTable (Add allowed_modules since it was pushed out-of-order in development)
ALTER TABLE "teacher_profiles" ADD COLUMN "allowed_modules" TEXT[] DEFAULT ARRAY[]::TEXT[];
