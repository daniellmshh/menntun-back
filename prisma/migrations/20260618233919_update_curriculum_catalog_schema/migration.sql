/*
  Warnings:

  - Added the required column `enfoque_pedagogico` to the `curriculum_catalog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fase` to the `curriculum_catalog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_registro` to the `curriculum_catalog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "curriculum_catalog" ADD COLUMN     "enfoque_pedagogico" TEXT NOT NULL,
ADD COLUMN     "fase" INTEGER NOT NULL,
ADD COLUMN     "id_registro" TEXT NOT NULL;
