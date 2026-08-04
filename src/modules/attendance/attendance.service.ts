import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";
import { AttendanceEventSource, AttendanceEventType, AttendancePresenceState, AttendanceStatus, DailyAttendanceStatus, UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../common/types";
import { CreateClassSessionDto, CreatePickupContactDto, CreatePushSubscriptionDto, DailyAttendanceReportQueryDto, ReopenDailyAttendanceDto, ScanAttendanceDto, UpdateAttendanceSettingsDto, UpdatePickupContactDto, UpsertClassAttendanceDto } from "./attendance.dto";
import { AttendanceNotificationsService } from "./attendance-notifications.service";

const ADMIN: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SCHOOL_ADMIN];
const GATE: UserRole[] = [...ADMIN, UserRole.ATTENDANCE_OPERATOR];
type UploadedImage = { mimetype: string; size: number; buffer: Buffer };

@Injectable()
export class AttendanceService {
  private readonly supabaseAdmin;
  constructor(private readonly config: ConfigService, private readonly notifications: AttendanceNotificationsService) {
    this.supabaseAdmin = createClient(config.get<string>("supabase.url") || "", config.get<string>("supabase.serviceRoleKey") || "", { auth: { autoRefreshToken: false, persistSession: false } });
  }
  private schoolId(user: RequestUser) { const id = user.activeSchoolId || user.schoolId; if (!id) throw new BadRequestException("Selecciona una escuela"); return id; }
  private admin(user: RequestUser) { if (!ADMIN.includes(user.role)) throw new ForbiddenException("Sólo administración puede configurar asistencias"); }
  private gate(user: RequestUser) { if (!GATE.includes(user.role)) throw new ForbiddenException("No tienes acceso a portería"); }
  private dateInZone(date: Date, timezone: string) { const p = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); const v = Object.fromEntries(p.map(x => [x.type, x.value])); return new Date(`${v.year}-${v.month}-${v.day}T00:00:00.000Z`); }
  private minutes(value: string) { const [h, m] = value.split(":").map(Number); return h * 60 + m; }
  private timeInZone(date: Date, timezone: string) { const p = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date); const v = Object.fromEntries(p.map(x => [x.type, x.value])); return Number(v.hour) * 60 + Number(v.minute); }
  private hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
  private async settings(schoolId: string) { return prisma.attendanceSettings.upsert({ where: { schoolId }, create: { schoolId }, update: {} }); }

  async getSettings(user: RequestUser) { return this.settings(this.schoolId(user)); }
  async updateSettings(user: RequestUser, dto: UpdateAttendanceSettingsDto) { this.admin(user); const schoolId = this.schoolId(user); return prisma.attendanceSettings.upsert({ where: { schoolId }, create: { schoolId, ...dto }, update: dto }); }

  async issueCredential(user: RequestUser, studentProfileId: string) {
    this.admin(user); const schoolId = this.schoolId(user);
    const student = await prisma.studentProfile.findFirst({ where: { id: studentProfileId, user: { schoolId } } }); if (!student) throw new NotFoundException("Alumno no encontrado");
    await prisma.attendanceCredential.updateMany({ where: { schoolId, studentProfileId, active: true }, data: { active: false, revokedAt: new Date() } });
    const secret = randomBytes(24).toString("base64url"); const credential = await prisma.attendanceCredential.create({ data: { schoolId, studentProfileId, secretHash: this.hash(secret) } });
    return { credentialId: credential.id, qrPayload: `menntun-attendance:v1:${credential.id}:${secret}` };
  }
  async revokeCredential(user: RequestUser, id: string) { this.admin(user); const count = await prisma.attendanceCredential.updateMany({ where: { id, schoolId: this.schoolId(user), active: true }, data: { active: false, revokedAt: new Date() } }); if (!count.count) throw new NotFoundException("Credencial activa no encontrada"); return { revoked: true }; }

  async listPickupContacts(user: RequestUser, studentProfileId: string) { const schoolId = this.schoolId(user); await this.assertStudentAccess(user, studentProfileId); return prisma.studentPickupContact.findMany({ where: { schoolId, studentProfileId }, orderBy: [{ active: "desc" }, { name: "asc" }] }); }
  async createPickupContact(user: RequestUser, dto: CreatePickupContactDto) { this.admin(user); const schoolId = this.schoolId(user); const exists = await prisma.studentProfile.findFirst({ where: { id: dto.studentProfileId, user: { schoolId } } }); if (!exists) throw new NotFoundException("Alumno no encontrado"); return prisma.studentPickupContact.create({ data: { ...dto, schoolId, validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined, validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined } }); }
  async updatePickupContact(user: RequestUser, id: string, dto: UpdatePickupContactDto) { this.admin(user); const schoolId = this.schoolId(user); const contact = await prisma.studentPickupContact.findFirst({ where: { id, schoolId } }); if (!contact) throw new NotFoundException("Persona autorizada no encontrada"); return prisma.studentPickupContact.update({ where: { id }, data: { ...dto, validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined, validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined } }); }

  async resolveCredential(user: RequestUser, qrPayload: string) {
    this.gate(user); const schoolId = this.schoolId(user); const parts = qrPayload.split(":");
    if (parts.length !== 4 || parts[0] !== "menntun-attendance" || parts[1] !== "v1") throw new BadRequestException("QR de asistencia inválido");
    const credential = await prisma.attendanceCredential.findFirst({ where: { id: parts[2], schoolId, active: true, secretHash: this.hash(parts[3]) }, include: { studentProfile: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } }, enrollments: { where: { status: "ACTIVE", group: { schoolId } }, include: { group: { include: { grade: true } } }, take: 1 } } } } });
    if (!credential) throw new NotFoundException("QR inválido o revocado");
    const enrollment = credential.studentProfile.enrollments[0]; if (!enrollment) throw new BadRequestException("El alumno no tiene matrícula activa");
    const contacts = await prisma.studentPickupContact.findMany({ where: { schoolId, studentProfileId: credential.studentProfileId, active: true }, orderBy: { name: "asc" } });
    return { student: { id: credential.studentProfileId, ...credential.studentProfile.user, group: enrollment.group }, contacts };
  }

  async scan(user: RequestUser, dto: ScanAttendanceDto) {
    this.gate(user); const schoolId = this.schoolId(user); const parts = dto.qrPayload.split(":"); if (parts.length !== 4 || parts[0] !== "menntun-attendance" || parts[1] !== "v1") throw new BadRequestException("QR de asistencia inválido");
    const credential = await prisma.attendanceCredential.findFirst({ where: { id: parts[2], schoolId, active: true, secretHash: this.hash(parts[3]) }, include: { studentProfile: { include: { user: true, enrollments: { where: { status: "ACTIVE", group: { schoolId } }, include: { group: true }, take: 1 } } } } });
    if (!credential) throw new NotFoundException("QR inválido o revocado"); const enrollment = credential.studentProfile.enrollments[0]; if (!enrollment) throw new BadRequestException("El alumno no tiene matrícula activa");
    if (dto.clientEventId) { const prior = await prisma.attendanceEvent.findFirst({ where: { schoolId, clientEventId: dto.clientEventId } }); if (prior) return { event: prior, duplicate: true, student: credential.studentProfile.user }; }
    const settings = await this.settings(schoolId); const occurredAt = dto.clientOccurredAt ? new Date(dto.clientOccurredAt) : new Date(); const localDate = this.dateInZone(occurredAt, settings.timezone);
    const state = await prisma.studentPresenceState.findUnique({ where: { schoolId_studentProfileId_localDate: { schoolId, studentProfileId: credential.studentProfileId, localDate } } });
    if (dto.type === AttendanceEventType.CORRECTION) throw new BadRequestException("Las correcciones deben hacerse desde el registro de clase");
    const isDeparture = dto.type === AttendanceEventType.CHECK_OUT || dto.type === AttendanceEventType.EARLY_RELEASE;
    const isArrival = dto.type === AttendanceEventType.CHECK_IN || dto.type === AttendanceEventType.RE_ENTRY;
    if (isDeparture) {
      if (state?.state !== AttendancePresenceState.INSIDE) throw new BadRequestException("El alumno no está registrado dentro del plantel");
      if (!dto.pickupContactId || !dto.idVerified) throw new BadRequestException("La salida requiere persona autorizada y verificación visual de identidad");
      const contact = await prisma.studentPickupContact.findFirst({ where: { id: dto.pickupContactId, schoolId, studentProfileId: credential.studentProfileId, active: true } }); if (!contact || (contact.validFrom && contact.validFrom > localDate) || (contact.validUntil && contact.validUntil < localDate)) throw new BadRequestException("La persona no está autorizada para esta fecha");
      if (dto.type === AttendanceEventType.EARLY_RELEASE && !dto.reason) throw new BadRequestException("La salida anticipada requiere motivo");
    }
    if (isArrival && state?.state === AttendancePresenceState.INSIDE) throw new BadRequestException("El alumno ya está dentro del plantel");
    const next = isArrival ? AttendancePresenceState.INSIDE : dto.type === AttendanceEventType.EARLY_RELEASE ? AttendancePresenceState.RELEASED : AttendancePresenceState.OUTSIDE;
    const late = dto.type === AttendanceEventType.CHECK_IN && this.timeInZone(occurredAt, settings.timezone) > this.minutes(settings.startTime) + settings.lateToleranceMins;
    const event = await prisma.$transaction(async tx => {
      const created = await tx.attendanceEvent.create({ data: { schoolId, groupId: enrollment.groupId, studentProfileId: credential.studentProfileId, credentialId: credential.id, pickupContactId: dto.pickupContactId, operatorId: user.id, type: dto.type, source: dto.source ?? AttendanceEventSource.QR_SCANNER, localDate, occurredAt, clientEventId: dto.clientEventId, deviceId: dto.deviceId, reason: dto.reason, idVerified: dto.idVerified ?? false } });
      await tx.studentPresenceState.upsert({ where: { schoolId_studentProfileId_localDate: { schoolId, studentProfileId: credential.studentProfileId, localDate } }, create: { schoolId, groupId: enrollment.groupId, studentProfileId: credential.studentProfileId, localDate, state: next, lastEventId: created.id }, update: { groupId: enrollment.groupId, state: next, lastEventId: created.id } });
      await tx.dailyAttendanceSummary.upsert({ where: { schoolId_studentProfileId_localDate: { schoolId, studentProfileId: credential.studentProfileId, localDate } }, create: { schoolId, groupId: enrollment.groupId, studentProfileId: credential.studentProfileId, localDate, status: late ? DailyAttendanceStatus.LATE : DailyAttendanceStatus.PRESENT, arrivedAt: next === AttendancePresenceState.INSIDE ? occurredAt : undefined, departedAt: next !== AttendancePresenceState.INSIDE ? occurredAt : undefined, hasGateEvidence: true }, update: { status: late ? DailyAttendanceStatus.LATE : DailyAttendanceStatus.PRESENT, ...(next === AttendancePresenceState.INSIDE ? { arrivedAt: occurredAt } : { departedAt: occurredAt }), hasGateEvidence: true } }); return created;
    });
    // Alerts are deliberately asynchronous: an unavailable mail/push provider must never
    // prevent the gate event, state transition, or audit trail from being persisted.
    void this.notifications.notifyEvent(event.id).catch(() => undefined);
    return { event, duplicate: false, student: { id: credential.studentProfileId, firstName: credential.studentProfile.user.firstName, lastName: credential.studentProfile.user.lastName, avatarUrl: credential.studentProfile.user.avatarUrl }, state: next };
  }

  async listClassContexts(user: RequestUser) {
    const schoolId = this.schoolId(user);
    const teacher = user.role === UserRole.TEACHER ? await this.teacher(user) : undefined;
    if (!teacher) this.admin(user);

    const [groupTeachers, subjectTeachers] = await Promise.all([
      prisma.groupTeacher.findMany({
        where: { group: { schoolId }, ...(teacher ? { teacherProfileId: teacher.id } : {}) },
        select: { groupId: true },
      }),
      prisma.subjectTeacher.findMany({
        where: { group: { schoolId }, ...(teacher ? { teacherProfileId: teacher.id } : {}) },
        select: { groupId: true },
      }),
    ]);

    const groupIds = teacher
      ? [...new Set([...groupTeachers.map((assignment) => assignment.groupId), ...subjectTeachers.map((assignment) => assignment.groupId)])]
      : undefined;
    const groups = await prisma.group.findMany({
      where: { schoolId, ...(groupIds ? { id: { in: groupIds } } : {}) },
      include: { grade: { select: { name: true } } },
      orderBy: [{ grade: { name: "asc" } }, { name: "asc" }],
    });

    const contexts = await Promise.all(groups.map(async (group) => {
      try {
        const context = await this.buildClassContext(user, group.id, false);
        return { id: context.group.id, name: context.group.name, grade: context.group.grade, sessionMode: context.sessionMode, subjects: context.subjects };
      } catch {
        return null;
      }
    }));
    return contexts.filter((context): context is NonNullable<typeof context> => context !== null);
  }

  async getClassContext(user: RequestUser, groupId: string) {
    return this.buildClassContext(user, groupId, true);
  }

  async createSession(user: RequestUser, dto: CreateClassSessionDto) {
    const schoolId = this.schoolId(user);
    const date = dto.localDate ? new Date(dto.localDate) : this.dateInZone(new Date(), (await this.settings(schoolId)).timezone);
    const context = await this.buildClassContext(user, dto.groupId, false);
    const blockLabel = dto.blockLabel ?? "general";

    if (context.sessionMode === "SUBJECT" && !dto.subjectId) {
      throw new BadRequestException("Selecciona la materia para iniciar este pase de lista.");
    }
    if (context.sessionMode === "GROUP" && dto.subjectId) {
      throw new BadRequestException("Este grupo usa un pase de lista general y no requiere materia.");
    }

    let teacherProfileId: string;
    let sessionKey: string;
    if (dto.subjectId) {
      const assignment = await prisma.subjectTeacher.findFirst({
        where: {
          groupId: dto.groupId,
          subjectId: dto.subjectId,
          teacherProfile: { user: { schoolId } },
          ...(user.role === UserRole.TEACHER ? { teacherProfileId: (await this.teacher(user)).id } : {}),
        },
        select: { teacherProfileId: true },
      });
      if (!assignment) throw new ForbiddenException("No tienes asignada esta materia y grupo.");
      teacherProfileId = assignment.teacherProfileId;
      sessionKey = `subject:${dto.subjectId}`;
    } else {
      teacherProfileId = context.generalTeacherProfileId!;
      sessionKey = "group";
    }

    return prisma.classAttendanceSession.upsert({
      where: { groupId_teacherProfileId_localDate_blockLabel_sessionKey: { groupId: dto.groupId, teacherProfileId, localDate: date, blockLabel, sessionKey } },
      create: { schoolId, groupId: dto.groupId, subjectId: dto.subjectId ?? null, teacherProfileId, localDate: date, blockLabel, sessionKey },
      update: {},
    });
  }

  private async buildClassContext(user: RequestUser, groupId: string, includeStudents: boolean) {
    const schoolId = this.schoolId(user);
    const teacher = user.role === UserRole.TEACHER ? await this.teacher(user) : undefined;
    if (!teacher) this.admin(user);

    const group = await prisma.group.findFirst({ where: { id: groupId, schoolId }, include: { grade: { select: { name: true } } } });
    if (!group) throw new NotFoundException("El grupo no pertenece a la escuela activa.");

    const [groupTeachers, subjectAssignments] = await Promise.all([
      prisma.groupTeacher.findMany({ where: { groupId }, select: { teacherProfileId: true } }),
      prisma.subjectTeacher.findMany({
        where: { groupId, ...(teacher ? { teacherProfileId: teacher.id } : {}) },
        include: { subject: { select: { id: true, name: true } } },
        orderBy: { subject: { name: "asc" } },
      }),
    ]);

    const isOnlyGroupTeacher = groupTeachers.length === 1 && (!teacher || groupTeachers[0].teacherProfileId === teacher.id);
    const canUseGeneralSession = subjectAssignments.length === 0 && isOnlyGroupTeacher;
    if (!canUseGeneralSession && subjectAssignments.length === 0) {
      throw new ForbiddenException("No tienes una asignación válida para pasar lista en este grupo.");
    }

    const sessionMode = subjectAssignments.length > 0 ? "SUBJECT" as const : "GROUP" as const;
    const result: {
      group: { id: string; name: string; grade: { name: string } };
      sessionMode: "GROUP" | "SUBJECT";
      subjects: { id: string; name: string }[];
      generalTeacherProfileId?: string;
      students?: { studentProfileId: string; firstName: string; lastName: string; enrollmentNumber: string | null }[];
    } = {
      group: { id: group.id, name: group.name, grade: group.grade },
      sessionMode,
      subjects: subjectAssignments.map(({ subject }) => subject),
      ...(canUseGeneralSession ? { generalTeacherProfileId: groupTeachers[0].teacherProfileId } : {}),
    };

    if (includeStudents) {
      const enrollments = await prisma.enrollment.findMany({
        where: { groupId, status: "ACTIVE" },
        include: { studentProfile: { include: { user: { select: { firstName: true, lastName: true } } } } },
        orderBy: [{ studentProfile: { user: { lastName: "asc" } } }, { studentProfile: { user: { firstName: "asc" } } }],
      });
      result.students = enrollments.map(({ studentProfile }) => ({
        studentProfileId: studentProfile.id,
        firstName: studentProfile.user.firstName,
        lastName: studentProfile.user.lastName,
        enrollmentNumber: studentProfile.enrollmentNumber,
      }));
    }
    return result;
  }
  async markSession(user: RequestUser, sessionId: string, dto: UpsertClassAttendanceDto) { const schoolId = this.schoolId(user); const session = await prisma.classAttendanceSession.findFirst({ where: { id: sessionId, schoolId } }); if (!session) throw new NotFoundException("Sesión no encontrada"); if (!ADMIN.includes(user.role) && session.teacherProfileId !== (await this.teacher(user)).id) throw new ForbiddenException("No puedes modificar esta sesión"); const active = await prisma.enrollment.findMany({ where: { groupId: session.groupId, status: "ACTIVE", studentProfileId: { in: dto.records.map(x => x.studentProfileId) } }, select: { studentProfileId: true } }); if (active.length !== dto.records.length) throw new BadRequestException("Todos los alumnos deben pertenecer al grupo"); await prisma.$transaction(dto.records.map(record => prisma.classAttendanceRecord.upsert({ where: { sessionId_studentProfileId: { sessionId, studentProfileId: record.studentProfileId } }, create: { sessionId, studentProfileId: record.studentProfileId, status: record.status, notes: record.notes }, update: { status: record.status, notes: record.notes, correctedAt: new Date(), correctionReason: record.correctionReason } }))); const evidence = dto.records.filter(x => x.status === AttendanceStatus.PRESENT || x.status === AttendanceStatus.LATE || x.status === AttendanceStatus.EXCUSED); await Promise.all(evidence.map(x => prisma.dailyAttendanceSummary.upsert({ where: { schoolId_studentProfileId_localDate: { schoolId, studentProfileId: x.studentProfileId, localDate: session.localDate } }, create: { schoolId, groupId: session.groupId, studentProfileId: x.studentProfileId, localDate: session.localDate, status: x.status === AttendanceStatus.EXCUSED ? DailyAttendanceStatus.EXCUSED : x.status === AttendanceStatus.LATE ? DailyAttendanceStatus.LATE : DailyAttendanceStatus.PRESENT, hasClassEvidence: true }, update: { hasClassEvidence: true, status: x.status === AttendanceStatus.EXCUSED ? DailyAttendanceStatus.EXCUSED : DailyAttendanceStatus.PRESENT } }))); return this.getSession(user, sessionId); }
  async getSession(user: RequestUser, id: string) {
    const schoolId = this.schoolId(user);
    const session = await prisma.classAttendanceSession.findFirst({ where: { id, schoolId }, include: { subject: true, records: { include: { studentProfile: { include: { user: { select: { firstName: true, lastName: true } } } } } } } });
    if (!session) throw new NotFoundException("Sesión no encontrada");
    if (!ADMIN.includes(user.role) && session.teacherProfileId !== (await this.teacher(user)).id) throw new ForbiddenException("No puedes consultar esta sesión");
    return session;
  }
  async live(user: RequestUser, localDate?: string) { this.gate(user); const schoolId = this.schoolId(user); const date = localDate ? new Date(localDate) : this.dateInZone(new Date(), (await this.settings(schoolId)).timezone); return prisma.studentPresenceState.findMany({ where: { schoolId, localDate: date }, include: { studentProfile: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } }, }, group: { include: { grade: true } } }, orderBy: { updatedAt: "desc" } }); }
  async timeline(user: RequestUser, studentProfileId: string) { await this.assertStudentAccess(user, studentProfileId); return prisma.attendanceEvent.findMany({ where: { schoolId: this.schoolId(user), studentProfileId }, include: { pickupContact: true, operator: { select: { firstName: true, lastName: true } } }, orderBy: { occurredAt: "desc" }, take: 100 }); }
  async closeDay(schoolId: string, date: Date) {
    const settings = await this.settings(schoolId); const now = new Date();
    const enrollments = await prisma.enrollment.findMany({ where: { status: "ACTIVE", group: { schoolId } }, select: { groupId: true, studentProfileId: true } });
    if (!enrollments.length) return { closed: 0, alreadyClosed: true, timezone: settings.timezone };

    const studentProfileIds = enrollments.map(({ studentProfileId }) => studentProfileId);
    const alreadyClosed = await prisma.dailyAttendanceSummary.findMany({
      where: { schoolId, localDate: date, studentProfileId: { in: studentProfileIds }, closedAt: { not: null } },
      select: { studentProfileId: true },
    });
    const closedStudentIds = new Set(alreadyClosed.map(({ studentProfileId }) => studentProfileId));
    const enrollmentsToClose = enrollments.filter(({ studentProfileId }) => !closedStudentIds.has(studentProfileId));

    // El cron se ejecuta cada diez minutos, pero un cierre ya terminado no debe
    // reescribir sus resúmenes ni alterar su marca de auditoría.
    if (!enrollmentsToClose.length) return { closed: 0, alreadyClosed: true, timezone: settings.timezone };

    const pendingStudentProfileIds = enrollmentsToClose.map(({ studentProfileId }) => studentProfileId);
    await prisma.$transaction(async tx => {
      await tx.dailyAttendanceSummary.createMany({
        data: enrollmentsToClose.map(({ groupId, studentProfileId }) => ({
          schoolId, groupId, studentProfileId, localDate: date,
          status: DailyAttendanceStatus.ABSENT, closedAt: now,
        })),
        skipDuplicates: true,
      });
      await tx.dailyAttendanceSummary.updateMany({
        where: {
          schoolId, localDate: date, studentProfileId: { in: pendingStudentProfileIds }, closedAt: null,
          status: DailyAttendanceStatus.PENDING, hasGateEvidence: false, hasClassEvidence: false,
        },
        data: { status: DailyAttendanceStatus.ABSENT, closedAt: now },
      });
      await tx.dailyAttendanceSummary.updateMany({
        where: { schoolId, localDate: date, studentProfileId: { in: pendingStudentProfileIds }, closedAt: null },
        data: { closedAt: now },
      });
    });
    return { closed: enrollmentsToClose.length, alreadyClosed: false, timezone: settings.timezone };
  }
  async reopenDay(user: RequestUser, date: string, dto: ReopenDailyAttendanceDto) {
    this.admin(user); const schoolId = this.schoolId(user); const localDate = new Date(date); const now = new Date();
    await prisma.$transaction([
      prisma.dailyAttendanceSummary.updateMany({ where: { schoolId, localDate }, data: { closedAt: null, reopenedAt: now, reopenReason: dto.reason } }),
      prisma.dailyAttendanceSummary.updateMany({ where: { schoolId, localDate, status: DailyAttendanceStatus.ABSENT, hasGateEvidence: false, hasClassEvidence: false }, data: { status: DailyAttendanceStatus.PENDING } }),
    ]);
    return { reopened: true };
  }
  async closeDueDays() {
    const modules = await prisma.schoolModule.findMany({ where: { module: { equals: "attendance", mode: "insensitive" }, active: true }, select: { schoolId: true } }); const now = new Date();
    for (const module of modules) {
      const setting = await this.settings(module.schoolId);
      const localDate = this.dateInZone(now, setting.timezone);
      if (!setting.activeWeekdays.includes(localDate.getUTCDay())) continue;
      if (this.timeInZone(now, setting.timezone) >= this.minutes(setting.dailyCloseTime)) await this.closeDay(setting.schoolId, localDate);
    }
  }
  async uploadPickupPhoto(user: RequestUser, contactId: string, file: UploadedImage) {
    this.admin(user); const schoolId = this.schoolId(user);
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype) || file.size > 2 * 1024 * 1024) throw new BadRequestException("La foto debe ser JPG, PNG o WebP y pesar máximo 2 MB");
    const contact = await prisma.studentPickupContact.findFirst({ where: { id: contactId, schoolId } }); if (!contact) throw new NotFoundException("Persona autorizada no encontrada");
    const bucket = "attendance-pickup-photos"; const { data: existing } = await this.supabaseAdmin.storage.getBucket(bucket);
    if (!existing) { const { error } = await this.supabaseAdmin.storage.createBucket(bucket, { public: false, fileSizeLimit: "2MB", allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] }); if (error) throw new BadRequestException("No fue posible preparar el almacenamiento de fotos"); }
    const extension = file.mimetype.split("/")[1] === "jpeg" ? "jpg" : file.mimetype.split("/")[1]; const path = `${schoolId}/${contact.studentProfileId}/${contact.id}.${extension}`;
    const { error } = await this.supabaseAdmin.storage.from(bucket).upload(path, file.buffer, { contentType: file.mimetype, upsert: true }); if (error) throw new BadRequestException("No fue posible cargar la foto");
    return prisma.studentPickupContact.update({ where: { id: contact.id }, data: { photoPath: path } });
  }
  async pickupPhotoUrl(user: RequestUser, contactId: string) {
    this.gate(user); const schoolId = this.schoolId(user); const contact = await prisma.studentPickupContact.findFirst({ where: { id: contactId, schoolId } }); if (!contact?.photoPath) throw new NotFoundException("La persona no tiene foto registrada");
    await this.assertStudentAccess(user, contact.studentProfileId); const { data, error } = await this.supabaseAdmin.storage.from("attendance-pickup-photos").createSignedUrl(contact.photoPath, 300); if (error || !data?.signedUrl) throw new BadRequestException("No fue posible obtener la foto"); return { url: data.signedUrl, expiresIn: 300 };
  }
  async dailyReport(user: RequestUser, query: DailyAttendanceReportQueryDto) {
    this.admin(user); const schoolId = this.schoolId(user); const date = query.date ? new Date(query.date) : this.dateInZone(new Date(), (await this.settings(schoolId)).timezone);
    const enrollments = await prisma.enrollment.findMany({ where: { status: "ACTIVE", group: { schoolId, ...(query.groupId ? { id: query.groupId } : {}) } }, include: { group: { include: { grade: true } }, studentProfile: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } }, dailyAttendance: { where: { schoolId, localDate: date }, take: 1 }, presenceStates: { where: { schoolId, localDate: date }, take: 1 } } } } });
    const rows = enrollments.map(enrollment => { const summary = enrollment.studentProfile.dailyAttendance[0]; return { studentProfileId: enrollment.studentProfileId, student: enrollment.studentProfile.user, group: enrollment.group, status: summary?.status ?? DailyAttendanceStatus.PENDING, arrivedAt: summary?.arrivedAt ?? null, departedAt: summary?.departedAt ?? null, hasGateEvidence: summary?.hasGateEvidence ?? false, hasClassEvidence: summary?.hasClassEvidence ?? false, state: enrollment.studentProfile.presenceStates[0]?.state ?? AttendancePresenceState.OUTSIDE, closedAt: summary?.closedAt ?? null }; }).filter(row => (!query.status || row.status === query.status) && (!query.withoutGateEvidence || !row.hasGateEvidence));
    const totals = rows.reduce((value, row) => ({ ...value, [row.status]: (value[row.status] ?? 0) + 1 }), {} as Record<string, number>); return { date, rows, totals };
  }
  async familyAttendance(user: RequestUser, studentProfileId?: string) {
    const schoolId = this.schoolId(user); let students: string[] = [];
    if (user.role === UserRole.STUDENT) { const student = await prisma.studentProfile.findFirst({ where: { userId: user.id, user: { schoolId } } }); if (student) students = [student.id]; }
    else {
      const parent = await prisma.parentProfile.findFirst({
        where: { userId: user.id },
        include: {
          studentLinks: {
            where: { studentProfile: { user: { schoolId } } },
            include: { studentProfile: { include: { user: { select: { firstName: true, lastName: true } } } } },
          },
        },
      });
      students = parent?.studentLinks.map(link => link.studentProfileId) ?? [];
    }
    if (studentProfileId) { if (!students.includes(studentProfileId)) throw new ForbiddenException("Sin acceso al alumno"); students = [studentProfileId]; }
    return Promise.all(students.map(async id => ({ student: await prisma.studentProfile.findUnique({ where: { id }, include: { user: { select: { firstName: true, lastName: true } } } }), summaries: await prisma.dailyAttendanceSummary.findMany({ where: { schoolId, studentProfileId: id }, orderBy: { localDate: "desc" }, take: 60 }), events: await prisma.attendanceEvent.findMany({ where: { schoolId, studentProfileId: id }, orderBy: { occurredAt: "desc" }, take: 100 }) })));
  }
  async upsertPushSubscription(user: RequestUser, dto: CreatePushSubscriptionDto) { if (user.role !== UserRole.PARENT && user.role !== UserRole.TUTOR) throw new ForbiddenException("Sólo tutores pueden activar alertas"); return prisma.pushSubscription.upsert({ where: { endpoint: dto.endpoint }, create: { userId: user.id, ...dto }, update: { userId: user.id, p256dh: dto.p256dh, auth: dto.auth, active: true } }); }
  async removePushSubscription(user: RequestUser, endpoint: string) { const result = await prisma.pushSubscription.updateMany({ where: { endpoint, userId: user.id }, data: { active: false } }); if (!result.count) throw new NotFoundException("Suscripción no encontrada"); return { removed: true }; }
  pushPublicKey() { return { publicKey: process.env.VAPID_PUBLIC_KEY || null }; }
  private async teacher(user: RequestUser) { const profile = await prisma.teacherProfile.findFirst({ where: { userId: user.id } }); if (!profile) throw new ForbiddenException("Perfil docente no configurado"); return profile; }
  private async assertStudentAccess(user: RequestUser, studentProfileId: string) {
    const schoolId = this.schoolId(user); const student = await prisma.studentProfile.findFirst({ where: { id: studentProfileId, user: { schoolId } } }); if (!student) throw new NotFoundException("Alumno no encontrado");
    if (ADMIN.includes(user.role) || user.role === UserRole.ATTENDANCE_OPERATOR) return;
    if (user.role === UserRole.STUDENT && student.userId !== user.id) throw new ForbiddenException("Sin acceso al alumno");
    if (user.role === UserRole.PARENT || user.role === UserRole.TUTOR) { const linked = await prisma.parentStudent.findFirst({ where: { studentProfileId, parentProfile: { userId: user.id } } }); if (!linked) throw new ForbiddenException("Sin acceso al alumno"); }
    if (user.role === UserRole.TEACHER) { const enrollment = await prisma.enrollment.findFirst({ where: { studentProfileId, status: "ACTIVE", group: { schoolId } }, select: { groupId: true } }); const assigned = enrollment && await prisma.subjectTeacher.findFirst({ where: { groupId: enrollment.groupId, teacherProfile: { userId: user.id } } }); if (!assigned) throw new ForbiddenException("Sin acceso al alumno"); }
  }
}
