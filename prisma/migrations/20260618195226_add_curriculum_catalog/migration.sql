-- DropIndex
DROP INDEX "curriculum_chunks_embedding_idx";

-- CreateTable
CREATE TABLE "curriculum_catalog" (
    "id" TEXT NOT NULL,
    "nivel_educativo" "NivelEducativo" NOT NULL,
    "grado_numero" INTEGER NOT NULL,
    "campo_formativo" "CampoFormativo" NOT NULL,
    "contenido" TEXT NOT NULL,
    "pda" TEXT NOT NULL,
    "fuente_documento" TEXT NOT NULL DEFAULT 'Programa Sintético Fase 2',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "curriculum_catalog_nivel_educativo_grado_numero_campo_forma_idx" ON "curriculum_catalog"("nivel_educativo", "grado_numero", "campo_formativo");
