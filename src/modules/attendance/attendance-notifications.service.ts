import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AttendanceNotificationChannel, AttendanceNotificationStatus, AttendanceNotificationType, AttendanceEventType } from "@prisma/client";
import { Resend } from "resend";
import webpush from "web-push";
import { prisma } from "../../lib/prisma";

@Injectable()
export class AttendanceNotificationsService {
  private readonly logger = new Logger(AttendanceNotificationsService.name);
  private readonly resend?: Resend;
  private readonly from?: string;
  private readonly frontendUrl: string;
  private pushEnabled = false;

  constructor(config: ConfigService) {
    const key = config.get<string>("resend.apiKey") || process.env.RESEND_API_KEY;
    this.from = config.get<string>("resend.from") || process.env.RESEND_FROM;
    this.frontendUrl = config.get<string>("frontendUrl") || "http://localhost:3000";
    if (key && this.from) this.resend = new Resend(key);
    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (subject && publicKey && privateKey) { webpush.setVapidDetails(subject, publicKey, privateKey); this.pushEnabled = true; }
  }

  async notifyEvent(eventId: string) {
    const event = await prisma.attendanceEvent.findUnique({ where: { id: eventId }, include: { studentProfile: { include: { user: true, parentLinks: { where: { isPrimary: true }, include: { parentProfile: { include: { user: true } } }, take: 1 } } } } });
    if (!event || (event.type !== AttendanceEventType.CHECK_IN && event.type !== AttendanceEventType.CHECK_OUT && event.type !== AttendanceEventType.EARLY_RELEASE)) return;
    const recipient = event.studentProfile.parentLinks[0]?.parentProfile.user;
    if (!recipient?.active) return;
    const type = event.type as AttendanceNotificationType;
    const label = event.type === AttendanceEventType.CHECK_IN ? "registró entrada" : event.type === AttendanceEventType.EARLY_RELEASE ? "registró salida anticipada" : "registró salida";
    const body = `${event.studentProfile.user.firstName} ${event.studentProfile.user.lastName} ${label} a las ${event.occurredAt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}.`;
    await Promise.all([this.sendEmail(event.id, event.schoolId, recipient.id, recipient.email, type, body), this.sendPush(event.id, event.schoolId, recipient.id, type, body)]);
  }

  private async record(eventId: string, schoolId: string, recipientId: string, type: AttendanceNotificationType, channel: AttendanceNotificationChannel) {
    return prisma.attendanceNotification.upsert({ where: { eventId_recipientId_channel: { eventId, recipientId, channel } }, create: { eventId, schoolId, recipientId, type, channel }, update: {} });
  }

  private async sendEmail(eventId: string, schoolId: string, recipientId: string, email: string, type: AttendanceNotificationType, body: string) {
    const record = await this.record(eventId, schoolId, recipientId, type, AttendanceNotificationChannel.EMAIL);
    if (record.status === AttendanceNotificationStatus.SENT) return;
    try {
      if (!this.resend || !this.from) throw new Error("Correo de asistencias no configurado");
      await this.resend.emails.send({ from: this.from, to: email, subject: "Actualización de asistencia", text: `${body}\n\nConsulta el historial en ${this.frontendUrl}/attendance/family` });
      await prisma.attendanceNotification.update({ where: { id: record.id }, data: { status: AttendanceNotificationStatus.SENT, sentAt: new Date(), error: null } });
    } catch (error) { await prisma.attendanceNotification.update({ where: { id: record.id }, data: { status: AttendanceNotificationStatus.FAILED, failedAt: new Date(), error: error instanceof Error ? error.message.slice(0, 500) : "Error de correo" } }); this.logger.warn(`Correo de asistencia no enviado: ${eventId}`); }
  }

  private async sendPush(eventId: string, schoolId: string, recipientId: string, type: AttendanceNotificationType, body: string) {
    const record = await this.record(eventId, schoolId, recipientId, type, AttendanceNotificationChannel.PUSH);
    if (record.status === AttendanceNotificationStatus.SENT) return;
    try {
      if (!this.pushEnabled) throw new Error("Web Push no configurado");
      const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: recipientId, active: true } });
      if (!subscriptions.length) throw new Error("Sin suscripción push activa");
      await Promise.all(subscriptions.map(async subscription => {
        try { await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: "Menntun · Asistencia", body, url: "/attendance/family" })); }
        catch (error: any) { if (error?.statusCode === 404 || error?.statusCode === 410) await prisma.pushSubscription.update({ where: { id: subscription.id }, data: { active: false } }); else throw error; }
      }));
      await prisma.attendanceNotification.update({ where: { id: record.id }, data: { status: AttendanceNotificationStatus.SENT, sentAt: new Date(), error: null } });
    } catch (error) { await prisma.attendanceNotification.update({ where: { id: record.id }, data: { status: AttendanceNotificationStatus.FAILED, failedAt: new Date(), error: error instanceof Error ? error.message.slice(0, 500) : "Error push" } }); }
  }
}
