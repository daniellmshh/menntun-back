import { Gender } from "@prisma/client";
export declare class CreateStudentDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    schoolId?: string;
    enrollmentNumber?: string;
    birthDate?: string;
    gender?: Gender;
    bloodType?: string;
    address?: string;
    groupId?: string;
}
export declare class UpdateStudentDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    active?: boolean;
    enrollmentNumber?: string;
    birthDate?: string;
    gender?: Gender;
    bloodType?: string;
    address?: string;
    groupId?: string;
}
