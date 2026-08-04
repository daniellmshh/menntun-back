import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import { AttendanceEventSource, AttendanceEventType, AttendanceStatus, DailyAttendanceStatus } from "@prisma/client";

export class UpdateAttendanceSettingsDto {
  @IsString() @IsOptional() timezone?: string;
  @IsString() @IsOptional() startTime?: string;
  @IsInt() @Min(0) @Max(180) @IsOptional() lateToleranceMins?: number;
  @IsString() @IsOptional() dailyCloseTime?: string;
  @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) @IsOptional() activeWeekdays?: number[];
}

export class CreatePickupContactDto {
  @IsString() @IsNotEmpty() studentProfileId: string;
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() relationship: string;
  @IsString() @IsOptional() phone?: string;
  @IsDateString() @IsOptional() validFrom?: string;
  @IsDateString() @IsOptional() validUntil?: string;
  @IsBoolean() @IsOptional() requiresIdCheck?: boolean;
}

export class UpdatePickupContactDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() relationship?: string;
  @IsString() @IsOptional() phone?: string;
  @IsDateString() @IsOptional() validFrom?: string;
  @IsDateString() @IsOptional() validUntil?: string;
  @IsBoolean() @IsOptional() requiresIdCheck?: boolean;
  @IsBoolean() @IsOptional() active?: boolean;
}

export class CreatePushSubscriptionDto {
  @IsString() @IsNotEmpty() endpoint: string;
  @IsString() @IsNotEmpty() p256dh: string;
  @IsString() @IsNotEmpty() auth: string;
}

export class DailyAttendanceReportQueryDto {
  @IsDateString() @IsOptional() date?: string;
  @IsString() @IsOptional() groupId?: string;
  @IsEnum(DailyAttendanceStatus) @IsOptional() status?: DailyAttendanceStatus;
  @IsBoolean() @IsOptional() withoutGateEvidence?: boolean;
}

export class ScanAttendanceDto {
  @IsString() @IsNotEmpty() qrPayload: string;
  @IsEnum(AttendanceEventType) type: AttendanceEventType;
  @IsEnum(AttendanceEventSource) @IsOptional() source?: AttendanceEventSource;
  @IsString() @IsOptional() pickupContactId?: string;
  @IsString() @IsOptional() reason?: string;
  @IsBoolean() @IsOptional() idVerified?: boolean;
  @IsString() @IsOptional() clientEventId?: string;
  @IsString() @IsOptional() deviceId?: string;
  @IsDateString() @IsOptional() clientOccurredAt?: string;
}

export class ResolveCredentialDto {
  @IsString() @IsNotEmpty() qrPayload: string;
}

export class CreateClassSessionDto {
  @IsString() @IsNotEmpty() groupId: string;
  @IsString() @IsOptional() subjectId?: string;
  @IsDateString() @IsOptional() localDate?: string;
  @IsString() @IsOptional() blockLabel?: string;
}

export class ClassAttendanceMarkDto {
  @IsString() @IsNotEmpty() studentProfileId: string;
  @IsEnum(AttendanceStatus) status: AttendanceStatus;
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() correctionReason?: string;
}

export class UpsertClassAttendanceDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ClassAttendanceMarkDto)
  records: ClassAttendanceMarkDto[];
}

export class ReopenDailyAttendanceDto { @IsString() @IsNotEmpty() reason: string; }
