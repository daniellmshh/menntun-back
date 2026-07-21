import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PlanningGenerationService } from '../src/modules/planning/planning-generation.service';
import { RequestUser } from '../src/common/types';
import { PrismaClient } from '@prisma/client';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const prisma = app.get<PrismaClient>('PRISMA');
  const planningService = app.get(PlanningGenerationService);

  const email = 'planeaciones@britanico.com';
  console.log(`Buscando usuario ${email}...`);
  const user = await prisma.user.findFirst({
    where: { email }
  });

  if (!user) {
    console.error(`Usuario ${email} no encontrado`);
    process.exit(1);
  }

  const requestUser: RequestUser = {
    id: user.id,
    email: user.email,
    schoolId: user.schoolId,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    supabaseUid: user.supabaseUid
  };

  const plannings = [
    {
      "camposSeleccionados": [
        {"campoFormativoId": "LENGUAJES", "contenidoId": "L_02"},
        {"campoFormativoId": "LENGUAJES", "contenidoId": "L_08"},
        {"campoFormativoId": "ETICA_NATURALEZA_SOCIEDADES", "contenidoId": "ENS_03"}
      ],
      "modalidad": "PROYECTOS",
      "ejesArticuladores": [
        "Apropiación de las culturas a través de la lectura y la escritura",
        "Artes y experiencias estéticas",
        "Interculturalidad crítica"
      ],
      "standaloneLevel": "PREESCOLAR",
      "standaloneGradeOrder": 3,
      "periodoProyecto": "11 al 22 de enero de 2027",
      "problematica": "Pérdida de la tradición oral y desconocimiento de los relatos, historias y leyendas locales por parte de las familias más jóvenes en la comunidad escolar.",
      "proposito": "Que las niñas y los niños conozcan relatos e historias de su comunidad para luego narrarlos de forma clara y coherente a través del teatro de papel (kamishibai), combinando diferentes lenguajes artísticos y promoviendo el aprecio por su historia y tradiciones.",
      "instrumentoEvaluacion": [
        "Registro anecdótico de manifestaciones significativas",
        "Rúbrica de evaluación de la expresión oral y corporal"
      ],
      "ajustesRazonables": [
        "Realizar cantos en momentos rutinarios para la estimulación del lenguaje oral.",
        "Uso de una caja de accesorios táctiles para apoyo de alumnos con barreras de aprendizaje."
      ],
      "actividadesPmc": [
        "Hagamos nuestro cuento: 'Érase Una Vez un Gran Año' (Recopilación de leyendas locales en el cuento grupal)"
      ]
    },
    {
      "camposSeleccionados": [
        {"campoFormativoId": "ETICA_NATURALEZA_SOCIEDADES", "contenidoId": "ENS_01"},
        {"campoFormativoId": "ETICA_NATURALEZA_SOCIEDADES", "contenidoId": "ENS_02"},
        {"campoFormativoId": "SABERES_PENSAMIENTO_CIENTIFICO", "contenidoId": "SPC_01"}
      ],
      "modalidad": "PROYECTOS",
      "ejesArticuladores": [
        "Pensamiento crítico",
        "Interculturalidad crítica",
        "Vida saludable"
      ],
      "standaloneLevel": "PREESCOLAR",
      "standaloneGradeOrder": 2,
      "periodoProyecto": "5 al 16 de abril de 2027",
      "problematica": "Falta de áreas verdes y flores en el plantel escolar, y escasos hábitos de cuidado de las plantas por parte de los alumnos de segundo grado.",
      "proposito": "Que las niñas y los niños de segundo grado interactúen con respeto y empatía con su entorno natural, reconozcan las necesidades de los seres vivos y colaboren en la siembra y el riego para diseñar y mantener un jardín escolar saludable.",
      "instrumentoEvaluacion": [
        "Diario de la educadora",
        "Escala de actitudes hacia la preservación del entorno"
      ],
      "ajustesRazonables": [
        "Uso de pictogramas para guiar visualmente la secuencia de siembra y riego.",
        "Establecer roles rotativos sencillos con apoyo de pares para alumnos que requieran guía adicional."
      ],
      "actividadesPmc": [
        "Campaña escolar de reforestación y adopción de una planta por aula"
      ]
    },
    {
      "camposSeleccionados": [
        {"campoFormativoId": "SABERES_PENSAMIENTO_CIENTIFICO", "contenidoId": "SPC_04"},
        {"campoFormativoId": "HUMANO_COMUNITARIO", "contenidoId": "DHC_02"},
        {"campoFormativoId": "HUMANO_COMUNITARIO", "contenidoId": "DHC_05"}
      ],
      "modalidad": "ABJ",
      "ejesArticuladores": [
        "Pensamiento crítico",
        "Inclusión"
      ],
      "standaloneLevel": "PREESCOLAR",
      "standaloneGradeOrder": 1,
      "periodoProyecto": "17 al 28 de mayo de 2027",
      "problematica": "Dificultad de los alumnos de nuevo ingreso para integrarse socialmente, esperar turnos y resolver pacíficamente conflictos durante las actividades de conteo lúdico.",
      "proposito": "Que las niñas y los niños de primer grado utilicen los números y el conteo en situaciones de juego corporal y de mesa, coordinando sus movimientos con precisión al manipular materiales diversos y estableciendo relaciones empáticas y colaborativas con sus pares.",
      "instrumentoEvaluacion": [
        "Registro anecdótico de interacciones sociales",
        "Guía de observación de la correspondencia uno a uno en el conteo lúdico"
      ],
      "ajustesRazonables": [
        "Realizar pausas activas con música de su interés para la autorregulación.",
        "Uso de materiales de conteo de texturas grandes (bloques y semillas gigantes) para estimulación sensorial."
      ],
      "actividadesPmc": [
        "Entrega de un diploma de asistencia diaria completa al finalizar el mes"
      ]
    }
  ];

  for (let i = 2; i < 3; i++) {
    console.log(`Generando planeación ${i + 1} de ${plannings.length}...`);
    try {
      const res = await planningService.generatePlanning(plannings[i] as any, requestUser);
      console.log(`✅ Planeación ${i + 1} generada con éxito: ID ${res.planning.id}`);
    } catch (e: any) {
      console.error(`❌ Error en la planeación ${i + 1}:`, e?.message || e);
    }
  }

  await app.close();
}

bootstrap().catch(console.error);
