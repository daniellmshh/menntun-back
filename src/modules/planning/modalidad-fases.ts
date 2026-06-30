import { PlanningModalidad } from "@prisma/client";

export function getFasesByModalidad(modalidad: PlanningModalidad): string[] {
  const fases: Record<PlanningModalidad, string[]> = {
    PROYECTOS: [
      "Punto de partida",
      "Planeación",
      "¡A trabajar!",
      "Comunicamos nuestros logros",
      "Reflexión sobre el aprendizaje",
    ],
    TALLERES_CRITICOS: [
      "Situación inicial",
      "Organización de las acciones",
      "Puesta en marcha",
      "Valoramos lo aprendido",
    ],
    RINCONES_APRENDIZAJE: [
      "Saberes previos",
      "Asamblea inicial y planeación",
      "Exploración de los rincones",
      "Compartimos lo aprendido",
      "Reflexión sobre el aprendizaje",
    ],
    CENTROS_INTERES: [
      "En contacto con la realidad",
      "Identificación e integración",
      "Expresión",
    ],
    UNIDADES_DIDACTICAS: [
      "Lectura de la realidad",
      "Identificación de la trama",
      "Planificación",
      "Exploración y descubrimiento",
      "Participación activa",
      "Valoración",
    ],
    ABJ: [
      "Planteamiento del juego",
      "Desarrollo de las actividades",
      "Compartimos la experiencia",
      "Comunidad de juego",
    ],
  };

  return fases[modalidad];
}
