import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EvaluationCalculationMode,
  EvaluationScoreStatus,
  EvaluationStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../common/types";
import {
  CreateEvaluationCategoryDto,
  CreateEvaluationDto,
  EvaluationScoreInputDto,
  UpdateEvaluationCategoryDto,
  UpdateEvaluationDto,
  UpsertEvaluationScoresDto,
  UpsertGradingPolicyDto,
} from "./grades.dto";
import { calculateSubjectAverage } from "./grade-calculation";

@Injectable()
export class GradesService {
  private schoolId(user: RequestUser) {
    const schoolId = user.activeSchoolId || user.schoolId;
    if (!schoolId) throw new BadRequestException("Selecciona una escuela para usar evaluaciones");
    return schoolId;
  }

  private requireAdmin(user: RequestUser) {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.SCHOOL_ADMIN) {
      throw new ForbiddenException("Solo la administración puede configurar evaluaciones");
    }
  }

  private async teacherProfileId(user: RequestUser, requestedId?: string) {
    if (user.role === UserRole.TEACHER) {
      const profile = await prisma.teacherProfile.findFirst({ where: { userId: user.id } });
      if (!profile) throw new ForbiddenException("Tu perfil docente no está configurado");
      return profile.id;
    }
    this.requireAdmin(user);
    if (!requestedId) throw new BadRequestException("teacherProfileId es requerido al crear una evaluación como administrador");
    const teacher = await prisma.teacherProfile.findUnique({ where: { id: requestedId }, include: { user: true } });
    if (!teacher || teacher.user.schoolId !== this.schoolId(user)) throw new NotFoundException("Docente no encontrado");
    return teacher.id;
  }

  private async assertTeacherAssignment(user: RequestUser, teacherProfileId: string, groupId: string, subjectId: string) {
    if (user.role !== UserRole.TEACHER) return;
    const assignment = await prisma.subjectTeacher.findUnique({
      where: { subjectId_teacherProfileId_groupId: { subjectId, teacherProfileId, groupId } },
    });
    if (!assignment) throw new ForbiddenException("No tienes asignada esta materia para el grupo seleccionado");
  }

  private async assertAcademicContext(schoolId: string, groupId: string, subjectId: string, periodId: string) {
    const [group, subject, period] = await Promise.all([
      prisma.group.findFirst({ where: { id: groupId, schoolId } }),
      prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
      prisma.period.findFirst({ where: { id: periodId, schoolYear: { schoolId } } }),
    ]);
    if (!group) throw new NotFoundException("Grupo no encontrado");
    if (!subject) throw new NotFoundException("Materia no encontrada");
    if (!period || period.schoolYearId !== group.schoolYearId) {
      throw new BadRequestException("El período debe pertenecer al ciclo escolar del grupo");
    }
    return { group, subject, period };
  }

  private assertEvaluationDateWithinPeriod(evaluationDate: Date, period: { startDate: Date; endDate: Date }) {
    const date = evaluationDate.getTime();
    if (date < period.startDate.getTime() || date > period.endDate.getTime()) {
      throw new BadRequestException("La fecha de evaluación debe estar dentro del período seleccionado");
    }
  }

  async getCategories(user: RequestUser) {
    return prisma.evaluationCategory.findMany({
      where: { schoolId: this.schoolId(user) },
      orderBy: [{ active: "desc" }, { order: "asc" }, { name: "asc" }],
    });
  }

  async createCategory(user: RequestUser, dto: CreateEvaluationCategoryDto) {
    this.requireAdmin(user);
    const schoolId = this.schoolId(user);
    try {
      return await prisma.evaluationCategory.create({ data: { ...dto, schoolId } });
    } catch (error: any) {
      if (error.code === "P2002") throw new ConflictException("Ya existe una categoría con ese nombre");
      throw error;
    }
  }

  async updateCategory(id: string, user: RequestUser, dto: UpdateEvaluationCategoryDto) {
    this.requireAdmin(user);
    const schoolId = this.schoolId(user);
    const category = await prisma.evaluationCategory.findFirst({ where: { id, schoolId } });
    if (!category) throw new NotFoundException("Categoría no encontrada");
    try {
      return await prisma.evaluationCategory.update({ where: { id }, data: dto });
    } catch (error: any) {
      if (error.code === "P2002") throw new ConflictException("Ya existe una categoría con ese nombre");
      throw error;
    }
  }

  async getGradingPolicy(user: RequestUser, groupId: string, subjectId: string, periodId: string) {
    const schoolId = this.schoolId(user);
    await this.assertAcademicContext(schoolId, groupId, subjectId, periodId);
    return prisma.gradingPolicy.findUnique({
      where: { groupId_subjectId_periodId: { groupId, subjectId, periodId } },
      include: { weights: { include: { category: true }, orderBy: { category: { order: "asc" } } } },
    });
  }

  async upsertGradingPolicy(user: RequestUser, dto: UpsertGradingPolicyDto) {
    this.requireAdmin(user);
    const schoolId = this.schoolId(user);
    await this.assertAcademicContext(schoolId, dto.groupId, dto.subjectId, dto.periodId);
    const weights = dto.weights ?? [];
    if (dto.calculationMode !== EvaluationCalculationMode.AVERAGE) {
      const total = weights.reduce((sum, item) => sum + Number(item.weight), 0);
      if (weights.length && Math.abs(total - 100) > 0.001) throw new BadRequestException("Las ponderaciones deben sumar 100%");
    }
    if (dto.passingScore !== undefined && dto.scaleMax !== undefined && dto.passingScore > dto.scaleMax) {
      throw new BadRequestException("La calificación aprobatoria no puede superar la escala máxima");
    }
    if (weights.length) {
      const validCount = await prisma.evaluationCategory.count({ where: { schoolId, id: { in: weights.map((item) => item.categoryId) } } });
      if (validCount !== new Set(weights.map((item) => item.categoryId)).size) throw new BadRequestException("Una o más categorías no pertenecen a la escuela");
    }
    return prisma.$transaction(async (tx) => {
      const policy = await tx.gradingPolicy.upsert({
        where: { groupId_subjectId_periodId: { groupId: dto.groupId, subjectId: dto.subjectId, periodId: dto.periodId } },
        create: {
          schoolId, groupId: dto.groupId, subjectId: dto.subjectId, periodId: dto.periodId,
          calculationMode: dto.calculationMode ?? EvaluationCalculationMode.WEIGHTED_CATEGORIES,
          scaleMax: dto.scaleMax ?? 10, passingScore: dto.passingScore ?? 6,
        },
        update: {
          calculationMode: dto.calculationMode, scaleMax: dto.scaleMax, passingScore: dto.passingScore,
        },
      });
      await tx.gradingPolicyWeight.deleteMany({ where: { policyId: policy.id } });
      if (weights.length) await tx.gradingPolicyWeight.createMany({ data: weights.map((item) => ({ policyId: policy.id, categoryId: item.categoryId, weight: item.weight })) });
      return tx.gradingPolicy.findUniqueOrThrow({ where: { id: policy.id }, include: { weights: { include: { category: true } } } });
    });
  }

  async listEvaluations(user: RequestUser, groupId: string, subjectId?: string, periodId?: string) {
    const schoolId = this.schoolId(user);
    const group = await prisma.group.findFirst({ where: { id: groupId, schoolId } });
    if (!group) throw new NotFoundException("Grupo no encontrado");
    if (user.role === UserRole.TEACHER) {
      const profileId = await this.teacherProfileId(user);
      const assignments = await prisma.subjectTeacher.findMany({ where: { teacherProfileId: profileId, groupId }, select: { subjectId: true } });
      const allowedSubjects = assignments.map((item) => item.subjectId);
      if (subjectId && !allowedSubjects.includes(subjectId)) throw new ForbiddenException("No tienes acceso a esta materia");
      return prisma.evaluation.findMany({ where: { schoolId, groupId, ...(subjectId ? { subjectId } : { subjectId: { in: allowedSubjects } }), ...(periodId ? { periodId } : {}) }, include: { category: true, subject: true, period: true, _count: { select: { scores: true } } }, orderBy: [{ evaluationDate: "desc" }, { createdAt: "desc" }] });
    }
    return prisma.evaluation.findMany({ where: { schoolId, groupId, ...(subjectId ? { subjectId } : {}), ...(periodId ? { periodId } : {}) }, include: { category: true, subject: true, period: true, _count: { select: { scores: true } } }, orderBy: [{ evaluationDate: "desc" }, { createdAt: "desc" }] });
  }

  async createEvaluation(user: RequestUser, dto: CreateEvaluationDto) {
    const schoolId = this.schoolId(user);
    const teacherProfileId = await this.teacherProfileId(user, dto.teacherProfileId);
    const context = await this.assertAcademicContext(schoolId, dto.groupId, dto.subjectId, dto.periodId);
    this.assertEvaluationDateWithinPeriod(new Date(dto.evaluationDate), context.period);
    await this.assertTeacherAssignment(user, teacherProfileId, dto.groupId, dto.subjectId);
    const category = await prisma.evaluationCategory.findFirst({ where: { id: dto.categoryId, schoolId, active: true } });
    if (!category) throw new NotFoundException("Categoría activa no encontrada");
    return prisma.$transaction(async (tx) => {
      const evaluation = await tx.evaluation.create({ data: { ...dto, teacherProfileId, schoolId, evaluationDate: new Date(dto.evaluationDate), status: dto.status ?? EvaluationStatus.DRAFT } });
      const students = await tx.enrollment.findMany({ where: { groupId: dto.groupId, status: "ACTIVE" }, select: { studentProfileId: true } });
      if (students.length) await tx.evaluationScore.createMany({ data: students.map(({ studentProfileId }) => ({ evaluationId: evaluation.id, studentProfileId })) });
      return tx.evaluation.findUniqueOrThrow({
        where: { id: evaluation.id },
        include: {
          category: true,
          scores: {
            include: {
              studentProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
          },
        },
      });
    });
  }

  async getEvaluation(id: string, user: RequestUser) {
    const schoolId = this.schoolId(user);
    const evaluation = await prisma.evaluation.findFirst({ where: { id, schoolId }, include: { category: true, subject: true, period: true, group: { include: { grade: true } }, scores: { include: { studentProfile: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } }, orderBy: { studentProfile: { user: { firstName: "asc" } } } } } });
    if (!evaluation) throw new NotFoundException("Evaluación no encontrada");
    if (user.role === UserRole.TEACHER) await this.assertTeacherAssignment(user, await this.teacherProfileId(user), evaluation.groupId, evaluation.subjectId);
    return evaluation;
  }

  async updateEvaluation(id: string, user: RequestUser, dto: UpdateEvaluationDto) {
    const evaluation = await this.getEvaluation(id, user);
    if (evaluation.status === EvaluationStatus.CLOSED) throw new BadRequestException("Una evaluación cerrada no puede modificarse");
    if (dto.categoryId) {
      const category = await prisma.evaluationCategory.findFirst({ where: { id: dto.categoryId, schoolId: evaluation.schoolId, active: true } });
      if (!category) throw new NotFoundException("Categoría activa no encontrada");
    }
    if (dto.evaluationDate) this.assertEvaluationDateWithinPeriod(new Date(dto.evaluationDate), evaluation.period);
    return prisma.evaluation.update({ where: { id }, data: { ...dto, ...(dto.evaluationDate ? { evaluationDate: new Date(dto.evaluationDate) } : {}) }, include: { category: true } });
  }

  async getAssignableTeachers(user: RequestUser, groupId: string, subjectId: string) {
    this.requireAdmin(user);
    const schoolId = this.schoolId(user);
    await this.assertAcademicContext(schoolId, groupId, subjectId, (await prisma.group.findFirstOrThrow({ where: { id: groupId, schoolId }, select: { schoolYear: { select: { periods: { select: { id: true }, take: 1 } } } } })).schoolYear.periods[0]?.id ?? "");
    return prisma.subjectTeacher.findMany({ where: { groupId, subjectId, teacherProfile: { user: { schoolId } } }, select: { teacherProfile: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } } });
  }

  async syncEvaluationStudents(id: string, user: RequestUser) {
    const evaluation = await this.getEvaluation(id, user);
    if (evaluation.status === EvaluationStatus.CLOSED) throw new BadRequestException("Una evaluación cerrada no puede modificar su lista de alumnos");
    const students = await prisma.enrollment.findMany({ where: { groupId: evaluation.groupId, status: "ACTIVE" }, select: { studentProfileId: true } });
    await prisma.evaluationScore.createMany({ data: students.map(({ studentProfileId }) => ({ evaluationId: id, studentProfileId })), skipDuplicates: true });
    return this.getEvaluation(id, user);
  }

  async upsertScores(id: string, user: RequestUser, dto: UpsertEvaluationScoresDto) {
    const evaluation = await this.getEvaluation(id, user);
    if (evaluation.status === EvaluationStatus.CLOSED) throw new BadRequestException("Una evaluación cerrada no admite cambios");
    const teacherProfileId = await this.teacherProfileId(user, evaluation.teacherProfileId);
    await this.assertTeacherAssignment(user, teacherProfileId, evaluation.groupId, evaluation.subjectId);
    const seen = new Set<string>();
    for (const item of dto.scores) {
      if (seen.has(item.studentProfileId)) throw new BadRequestException("Un alumno sólo puede aparecer una vez por envío");
      seen.add(item.studentProfileId);
      if (item.status === EvaluationScoreStatus.GRADED && (item.score === undefined || item.score === null)) throw new BadRequestException("Una calificación requiere puntaje");
      if (item.score !== undefined && item.score !== null && item.score > Number(evaluation.maxScore)) throw new BadRequestException("El puntaje no puede superar el máximo de la evaluación");
    }
    const enrolled = await prisma.enrollment.findMany({ where: { groupId: evaluation.groupId, studentProfileId: { in: [...seen] }, status: "ACTIVE" }, select: { studentProfileId: true } });
    if (enrolled.length !== seen.size) throw new BadRequestException("Todos los alumnos deben pertenecer activamente al grupo");
    await prisma.$transaction(dto.scores.map((item: EvaluationScoreInputDto) => prisma.evaluationScore.upsert({
      where: { evaluationId_studentProfileId: { evaluationId: id, studentProfileId: item.studentProfileId } },
      create: { evaluationId: id, studentProfileId: item.studentProfileId, score: item.score, status: item.status, feedback: item.feedback, gradedAt: item.status === EvaluationScoreStatus.GRADED ? new Date() : null, gradedByTeacherProfileId: item.status === EvaluationScoreStatus.GRADED ? teacherProfileId : null },
      update: { score: item.score, status: item.status, feedback: item.feedback, gradedAt: item.status === EvaluationScoreStatus.GRADED ? new Date() : null, gradedByTeacherProfileId: item.status === EvaluationScoreStatus.GRADED ? teacherProfileId : null },
    })));
    return this.getEvaluation(id, user);
  }

  async getStudentPeriodSummary(user: RequestUser, studentProfileId: string, periodId: string) {
    const schoolId = this.schoolId(user);
    const student = await prisma.studentProfile.findFirst({ where: { id: studentProfileId, user: { schoolId } }, include: { user: true } });
    if (!student) throw new NotFoundException("Alumno no encontrado");
    if (user.role === UserRole.PARENT || user.role === UserRole.TUTOR) {
      const linked = await prisma.parentStudent.findFirst({ where: { studentProfileId, parentProfile: { userId: user.id } } });
      if (!linked) throw new ForbiddenException("No tienes acceso a este alumno");
    } else if (user.role === UserRole.STUDENT && student.userId !== user.id) throw new ForbiddenException("No tienes acceso a este alumno");
    else if (user.role === UserRole.TEACHER) {
      const profileId = await this.teacherProfileId(user);
      const assigned = await prisma.enrollment.findFirst({
        where: { studentProfileId, group: { schoolId, teachers: { some: { teacherProfileId: profileId } } } },
      });
      if (!assigned) throw new ForbiddenException("No tienes acceso a este alumno");
    }
    const scores = await prisma.evaluationScore.findMany({ where: { studentProfileId, status: EvaluationScoreStatus.GRADED, evaluation: { schoolId, periodId, status: { not: EvaluationStatus.DRAFT } } }, include: { evaluation: { include: { subject: true, category: true } } } });
    const policies = await prisma.gradingPolicy.findMany({ where: { schoolId, periodId }, include: { weights: true } });
    const policyMap = new Map(policies.map((item) => [`${item.groupId}:${item.subjectId}`, item]));
    const bySubject = new Map<string, typeof scores>();
    scores.forEach((item) => { const current = bySubject.get(item.evaluation.subjectId) ?? []; current.push(item); bySubject.set(item.evaluation.subjectId, current); });
    const subjects = [...bySubject.entries()].map(([subjectId, entries]) => {
      const policy = policyMap.get(`${entries[0].evaluation.groupId}:${subjectId}`);
      const configuredWeights = new Map((policy?.weights ?? []).map((weight) => [weight.categoryId, Number(weight.weight) / 100]));
      const scaleMax = Number(policy?.scaleMax ?? 10);
      const average = calculateSubjectAverage(entries.map((item) => ({ categoryId: item.evaluation.categoryId, categoryName: item.evaluation.category.name, score: Number(item.score), maxScore: Number(item.evaluation.maxScore) })), scaleMax, policy?.calculationMode === EvaluationCalculationMode.WEIGHTED_CATEGORIES, configuredWeights);
      return { subjectId, subject: entries[0].evaluation.subject.name, average: average ?? 0, scaleMax, passingScore: Number(policy?.passingScore ?? 6), evaluationsGraded: entries.length };
    });
    const overallAverage = subjects.length ? Number((subjects.reduce((sum, item) => sum + item.average / item.scaleMax, 0) / subjects.length * 10).toFixed(2)) : null;
    return { student: { id: student.id, firstName: student.user.firstName, lastName: student.user.lastName }, periodId, subjects, overallAverage };
  }

  async getMyStudents(user: RequestUser) {
    const schoolId = this.schoolId(user);
    if (user.role === UserRole.STUDENT) {
      return prisma.studentProfile.findMany({
        where: { userId: user.id, user: { schoolId } },
        select: { id: true, user: { select: { firstName: true, lastName: true } }, enrollments: { where: { status: "ACTIVE" }, select: { group: { select: { schoolYear: { select: { id: true, name: true, periods: { orderBy: { order: "asc" }, select: { id: true, name: true } } } } } } } } },
      });
    }
    if (user.role !== UserRole.PARENT && user.role !== UserRole.TUTOR) throw new ForbiddenException("Este recurso sólo está disponible para familias y alumnos");
    return prisma.studentProfile.findMany({
      where: { user: { schoolId }, parentLinks: { some: { parentProfile: { userId: user.id } } } },
      select: { id: true, user: { select: { firstName: true, lastName: true } }, enrollments: { where: { status: "ACTIVE" }, select: { group: { select: { schoolYear: { select: { id: true, name: true, periods: { orderBy: { order: "asc" }, select: { id: true, name: true } } } } } } } } },
    });
  }
}
