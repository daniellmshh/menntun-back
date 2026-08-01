import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    }
  }
});

const SQL_STEPS = [
  // Step 1: Create new enums (using DO blocks for idempotency)
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoSolicitud') THEN
      CREATE TYPE "TipoSolicitud" AS ENUM ('INSCRIPCION', 'REINSCRIPCION');
    END IF;
  END $$`,
  
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoCargo') THEN
      CREATE TYPE "TipoCargo" AS ENUM ('INSCRIPCION_AUTOMATICO', 'REINSCRIPCION_AUTOMATICO', 'MANUAL');
    END IF;
  END $$`,
  
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PagoMetodo') THEN
      CREATE TYPE "PagoMetodo" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CHEQUE', 'OTRO');
    END IF;
  END $$`,
  
  // Step 2: Add new values to CargoEstado
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PARCIAL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CargoEstado')) THEN
      ALTER TYPE "CargoEstado" ADD VALUE 'PARCIAL';
    END IF;
  END $$`,
  
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LIQUIDADO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CargoEstado')) THEN
      ALTER TYPE "CargoEstado" ADD VALUE 'LIQUIDADO';
    END IF;
  END $$`,

  // Step 3: Extend student_profiles
  `ALTER TABLE "student_profiles"
    ADD COLUMN IF NOT EXISTS "segundo_nombre" TEXT,
    ADD COLUMN IF NOT EXISTS "segundo_apellido" TEXT,
    ADD COLUMN IF NOT EXISTS "curp" TEXT,
    ADD COLUMN IF NOT EXISTS "nacionalidad" TEXT`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'student_profiles' AND indexname = 'student_profiles_curp_key') THEN
      CREATE UNIQUE INDEX "student_profiles_curp_key" ON "student_profiles"("curp") WHERE curp IS NOT NULL;
    END IF;
  END $$`,

  // Step 4: Extend solicitudes_inscripcion
  `ALTER TABLE "solicitudes_inscripcion"
    ADD COLUMN IF NOT EXISTS "tipo_solicitud" "TipoSolicitud" NOT NULL DEFAULT 'INSCRIPCION',
    ADD COLUMN IF NOT EXISTS "primer_nombre" TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "segundo_nombre" TEXT,
    ADD COLUMN IF NOT EXISTS "primer_apellido" TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "segundo_apellido" TEXT,
    ADD COLUMN IF NOT EXISTS "curp" TEXT,
    ADD COLUMN IF NOT EXISTS "nacionalidad" TEXT,
    ADD COLUMN IF NOT EXISTS "escuela_procedencia" TEXT,
    ADD COLUMN IF NOT EXISTS "grade_id" TEXT,
    ADD COLUMN IF NOT EXISTS "group_id" TEXT,
    ADD COLUMN IF NOT EXISTS "motivo_rechazo" TEXT,
    ADD COLUMN IF NOT EXISTS "rechazado_por_id" TEXT`,
  
  `UPDATE "solicitudes_inscripcion" SET "primer_nombre" = "first_name" WHERE "primer_nombre" = ''`,
  `UPDATE "solicitudes_inscripcion" SET "primer_apellido" = "last_name" WHERE "primer_apellido" = ''`,
  
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solicitudes_inscripcion' AND column_name = 'cancelation_reason') THEN
      UPDATE "solicitudes_inscripcion" SET "motivo_rechazo" = "cancelation_reason" WHERE "cancelation_reason" IS NOT NULL AND "motivo_rechazo" IS NULL;
      ALTER TABLE "solicitudes_inscripcion" DROP COLUMN "cancelation_reason";
    END IF;
  END $$`,
  
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solicitudes_inscripcion' AND column_name = 'grado_propuesto') THEN
      ALTER TABLE "solicitudes_inscripcion" DROP COLUMN "grado_propuesto";
    END IF;
  END $$`,

  // Step 5: Extend datos_padres_solicitud
  `ALTER TABLE "datos_padres_solicitud"
    ADD COLUMN IF NOT EXISTS "primer_nombre" TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "segundo_nombre" TEXT,
    ADD COLUMN IF NOT EXISTS "primer_apellido" TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "segundo_apellido" TEXT,
    ADD COLUMN IF NOT EXISTS "domicilio" TEXT,
    ADD COLUMN IF NOT EXISTS "identificacion_url" TEXT`,
  
  `UPDATE "datos_padres_solicitud" SET "primer_nombre" = "first_name" WHERE "primer_nombre" = ''`,
  `UPDATE "datos_padres_solicitud" SET "primer_apellido" = "last_name" WHERE "primer_apellido" = ''`,

  // Step 6: Extend documentos_solicitud
  `ALTER TABLE "documentos_solicitud"
    ADD COLUMN IF NOT EXISTS "tipo_documento_id" TEXT,
    ADD COLUMN IF NOT EXISTS "nombre_documento" TEXT`,

  // Step 7: Create tipos_documento_escuela
  `CREATE TABLE IF NOT EXISTS "tipos_documento_escuela" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "school_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tipos_documento_escuela_pkey" PRIMARY KEY ("id")
  )`,
  
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'tipos_documento_escuela_school_id_slug_key') THEN
      CREATE UNIQUE INDEX "tipos_documento_escuela_school_id_slug_key" ON "tipos_documento_escuela"("school_id", "slug");
    END IF;
  END $$`,
  
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tipos_documento_escuela_school_id_fkey') THEN
      ALTER TABLE "tipos_documento_escuela" ADD CONSTRAINT "tipos_documento_escuela_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$`,
  
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'documentos_solicitud_tipo_documento_id_fkey') THEN
      ALTER TABLE "documentos_solicitud" ADD CONSTRAINT "documentos_solicitud_tipo_documento_id_fkey" FOREIGN KEY ("tipo_documento_id") REFERENCES "tipos_documento_escuela"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$`,

  // Step 8: Create catalogo_cargos
  `CREATE TABLE IF NOT EXISTS "catalogo_cargos" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "school_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "monto" DECIMAL(10,2) NOT NULL,
    "tipo" "TipoCargo" NOT NULL DEFAULT 'MANUAL',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "catalogo_cargos_pkey" PRIMARY KEY ("id")
  )`,
  
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'catalogo_cargos_school_id_nombre_key') THEN
      CREATE UNIQUE INDEX "catalogo_cargos_school_id_nombre_key" ON "catalogo_cargos"("school_id", "nombre");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'catalogo_cargos_school_id_fkey') THEN
      ALTER TABLE "catalogo_cargos" ADD CONSTRAINT "catalogo_cargos_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$`,

  // Step 9: Create cargos table
  `CREATE TABLE IF NOT EXISTS "cargos" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "school_id" TEXT NOT NULL,
    "student_profile_id" TEXT NOT NULL,
    "school_year_id" TEXT,
    "catalogo_cargo_id" TEXT,
    "solicitud_inscripcion_id" TEXT,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "saldo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fecha_vencimiento" TIMESTAMPTZ,
    "estado" "CargoEstado" NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
  )`,
  
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'cargos_school_id_fkey') THEN
      ALTER TABLE "cargos" ADD CONSTRAINT "cargos_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'cargos_student_profile_id_fkey') THEN
      ALTER TABLE "cargos" ADD CONSTRAINT "cargos_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'cargos_school_year_id_fkey') THEN
      ALTER TABLE "cargos" ADD CONSTRAINT "cargos_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'cargos_catalogo_cargo_id_fkey') THEN
      ALTER TABLE "cargos" ADD CONSTRAINT "cargos_catalogo_cargo_id_fkey" FOREIGN KEY ("catalogo_cargo_id") REFERENCES "catalogo_cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'cargos_solicitud_inscripcion_id_fkey') THEN
      ALTER TABLE "cargos" ADD CONSTRAINT "cargos_solicitud_inscripcion_id_fkey" FOREIGN KEY ("solicitud_inscripcion_id") REFERENCES "solicitudes_inscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$`,

  // Step 10: Migrate data from cargos_inscripcion to cargos
  `INSERT INTO "cargos" (
    "id", "school_id", "student_profile_id", "school_year_id",
    "solicitud_inscripcion_id", "concepto", "monto", "saldo",
    "fecha_vencimiento", "estado", "created_at", "updated_at"
  )
  SELECT
    ci.id,
    COALESCE(u.school_id, '') AS school_id,
    ci.student_profile_id,
    ci.school_year_id,
    ci.solicitud_inscripcion_id,
    ci.concepto,
    ci.monto,
    0::DECIMAL AS saldo,
    ci.fecha_vencimiento,
    CASE
      WHEN ci.estado::text = 'PAGADO' THEN 'LIQUIDADO'::"CargoEstado"
      ELSE ci.estado::"CargoEstado"
    END AS estado,
    ci.created_at,
    ci.updated_at
  FROM "cargos_inscripcion" ci
  LEFT JOIN "student_profiles" sp ON sp.id = ci.student_profile_id
  LEFT JOIN "users" u ON u.id = sp.user_id
  WHERE u.school_id IS NOT NULL
  ON CONFLICT (id) DO NOTHING`,

  // Step 11: Create pagos table
  `CREATE TABLE IF NOT EXISTS "pagos" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "cargo_id" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "metodo" "PagoMetodo" NOT NULL DEFAULT 'EFECTIVO',
    "referencia" TEXT,
    "notas" TEXT,
    "creado_por" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
  )`,
  
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'pagos_cargo_id_fkey') THEN
      ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,

  // Step 12: Drop old table
  `DROP TABLE IF EXISTS "cargos_inscripcion"`,
];

async function main() {
  console.log('🚀 Starting migration...\n');
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < SQL_STEPS.length; i++) {
    const sql = SQL_STEPS[i];
    const preview = sql.trim().substring(0, 60).replace(/\s+/g, ' ');
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`  ✅ Step ${i + 1}: ${preview}...`);
      success++;
    } catch (e: any) {
      console.error(`  ❌ Step ${i + 1}: ${preview}...`);
      console.error(`     Error: ${e.message?.substring(0, 150)}`);
      failed++;
    }
  }
  
  console.log(`\n✅ Migration complete: ${success} OK, ${failed} failed`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
