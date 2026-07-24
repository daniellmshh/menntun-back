import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { PlanningGenerationService } from "../src/modules/planning/planning-generation.service";
import { PrismaClient } from "@prisma/client";

async function run() {
  const prisma = new PrismaClient();
  let user = await prisma.user.findFirst({
    where: { email: "independiente@prueba.com" },
    include: { teacherProfile: true }
  });

  if (!user) {
    console.error("User not found!");
    process.exit(1);
  }

  if (!user.teacherProfile) {
    console.log("Creating teacher profile for independent user...");
    const newProfile = await prisma.teacherProfile.create({
      data: {
        userId: user.id
      }
    });
    user.teacherProfile = newProfile as any;
  }

  console.log("Teacher profile:", user.teacherProfile?.id);

  const payload = {
    camposSeleccionados: [
      {
        campoFormativoId: "HUMANO_COMUNITARIO",
        contenidoId: "DHC_08",
        pdaLiteral: "Expresa qué comportamientos, objetos, materiales y lugares pueden provocar accidentes y poner en riesgo la seguridad y el bienestar personal y colectivo."
      },
      {
        campoFormativoId: "ETICA_NATURALEZA_SOCIEDADES",
        contenidoId: "ENS_04",
        pdaLiteral: "Acuerda con su familia, pares y otras personas las responsabilidades que tendrá en su hogar y escuela, y explica por qué es importante cumplirlas."
      },
      {
        campoFormativoId: "SABERES_PENSAMIENTO_CIENTIFICO",
        contenidoId: "SPC_03",
        pdaLiteral: "Mezcla o combina elementos de su entorno, e identifica reacciones diversas, siguiendo normas de seguridad."
      },
      {
        campoFormativoId: "LENGUAJES",
        contenidoId: "L_09",
        pdaLiteral: "Relaciona en las manifestaciones artísticas y culturales sucesos, experiencias o emociones culturales."
      }
    ],
    modalidad: "PROYECTOS",
    startDate: "2026-06-08",
    endDate: "2026-06-19",
    activitiesPerDay: 3,
    problematica: "Se ha observado que las niñas y los niños aún presentan dificultades para identificar situaciones de riesgo y actuar de manera preventiva ante posibles accidentes dentro de la escuela y otros espacios de convivencia.",
    proposito: "Que las niñas y los niños identifiquen situaciones de riesgo presentes en la escuela, el hogar y la comunidad, reconozcan medidas de prevención y participen en acciones que promuevan el cuidado de su integridad personal y colectiva, fortaleciendo una cultura de autocuidado y protección.",
    ejesArticuladores: [
      "VIDA_SALUDABLE",
      "INCLUSION",
      "INTERCULTURALIDAD_CRITICA",
      "APROPIACION_DE_LAS_CULTURAS_A_TRAVES_DE_LA_LECTURA_Y_LA_ESCRITURA",
      "ARTES_Y_EXPERIENCIAS_ESTETICAS"
    ],
    instrumentoEvaluacion: [
      "Rúbrica de evaluación",
      "Registro de manifestaciones significativas",
      "Diario de la educadora"
    ],
    ajustesRazonables: [
      "Uso de pictogramas para indicar la acción a realizar durante las actividades.",
      "Realizar cantos en momentos rutinarios para la estimulación del lenguaje oral.",
      "Realizar pausas activas con música de su interés."
    ],
    actividadesPmc: [
      "Entregar un diploma a los alumnos que cuenten con una asistencia diaria completa al finalizar el mes.",
      "Hagamos nuestro cuento: 'Érase Una Vez un Gran Año' (Evento de fin de cursos)"
    ],
    standaloneLevel: "PREESCOLAR",
    standaloneGradeOrder: 2,
    periodoProyecto: "Del 8 al 19 de junio de 2026",
    contextoInicial: "El proyecto se desarrollará a lo largo de dos semanas y se centrará en la identificación de riesgos escolares mediante recorridos y la posterior creación y colocación colaborativa de señalamientos de protección civil en el plantel.",
    targetTeacherProfileId: user.teacherProfile?.id
  };

  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(PlanningGenerationService);

  try {
    const result = await service.generatePlanning(payload as any, user as any);
    console.log("Planeación generada exitosamente! ID:", result.planning.id);
  } catch (e) {
    console.error("Error al generar:", e);
  }

  await app.close();
  await prisma.$disconnect();
}

run();
