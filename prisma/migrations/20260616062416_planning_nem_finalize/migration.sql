/*
  Warnings:

  - Added the required column `campoFormativo` to the `plannings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contenidos` to the `plannings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contexto_inicial` to the `plannings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fases` to the `plannings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modalidad` to the `plannings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pda` to the `plannings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `produccion_sugerida` to the `plannings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `relevancia_social` to the `plannings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PlanningModalidad" AS ENUM ('PROYECTOS', 'ABJ', 'CENTROS_INTERES', 'TALLERES_CRITICOS', 'RINCONES_APRENDIZAJE', 'UNIDADES_DIDACTICAS');

-- CreateEnum
CREATE TYPE "CampoFormativo" AS ENUM ('LENGUAJES', 'SABERES_PENSAMIENTO_CIENTIFICO', 'ETICA_NATURALEZA_SOCIEDADES', 'HUMANO_COMUNITARIO');

-- CreateEnum
CREATE TYPE "EjeArticulador" AS ENUM ('PENSAMIENTO_CRITICO', 'VIDA_SALUDABLE', 'INCLUSION', 'INTERCULTURALIDAD_CRITICA', 'IGUALDAD_GENERO', 'ARTE_CULTURA', 'APROPIACION_TECNOLOGIA');

-- DropForeignKey
ALTER TABLE "plannings" DROP CONSTRAINT "plannings_group_id_fkey";

-- DropForeignKey
ALTER TABLE "plannings" DROP CONSTRAINT "plannings_subject_id_fkey";

-- AlterTable
ALTER TABLE "plannings" ADD COLUMN     "campoFormativo" "CampoFormativo" NOT NULL,
ADD COLUMN     "contenidos" TEXT NOT NULL,
ADD COLUMN     "contexto_inicial" TEXT NOT NULL,
ADD COLUMN     "ejesArticuladores" "EjeArticulador"[],
ADD COLUMN     "fases" JSONB NOT NULL,
ADD COLUMN     "is_standalone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "modalidad" "PlanningModalidad" NOT NULL,
ADD COLUMN     "pda" TEXT NOT NULL,
ADD COLUMN     "produccion_sugerida" TEXT NOT NULL,
ADD COLUMN     "recursos" JSONB,
ADD COLUMN     "relevancia_social" TEXT NOT NULL,
ADD COLUMN     "standalone_grade_order" INTEGER,
ADD COLUMN     "standalone_level" "NivelEducativo",
ALTER COLUMN "group_id" DROP NOT NULL,
ALTER COLUMN "subject_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "plannings" ADD CONSTRAINT "plannings_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plannings" ADD CONSTRAINT "plannings_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
