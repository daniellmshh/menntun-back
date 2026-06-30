export declare class CreateTeacherDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    schoolId?: string;
    employeeNumber?: string;
    specialty?: string;
    hireDate?: string;
    allowedModules?: string[];
}
export declare class UpdateTeacherDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    active?: boolean;
    employeeNumber?: string;
    specialty?: string;
    hireDate?: string;
    allowedModules?: string[];
}
