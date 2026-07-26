const fs = require('fs');

const files = [
  'src/modules/academic/academic.controller.ts',
  'src/modules/academic/academic.service.ts',
  'src/modules/auth/auth.service.ts',
  'src/modules/enrollments/enrollments.controller.ts',
  'src/modules/organizations/organizations.service.ts',
  'src/modules/planning/planning.controller.ts',
  'src/modules/teachers/teachers.service.ts'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  if (file.includes('academic.controller.ts')) {
    content = content.replace(/user\.schoolId/g, "(user.activeSchoolId || user.schoolId) as string");
  }
  
  if (file.includes('academic.service.ts')) {
    content = content.replace(/where: \{ schoolId: targetSchoolId \}/g, "where: { schoolId: targetSchoolId as string }");
    content = content.replace(/where: \{ schoolId: scopedSchoolId \}/g, "where: { schoolId: scopedSchoolId as string }");
    content = content.replace(/schoolId: targetSchoolId/g, "schoolId: targetSchoolId as string");
  }

  if (file.includes('enrollments.controller.ts')) {
    content = content.replace(/schoolId\)/g, "schoolId as string)");
    content = content.replace(/user\.schoolId/g, "(user.activeSchoolId || user.schoolId) as string");
  }

  if (file.includes('organizations.service.ts')) {
    content = content.replace(/this\.configService\.get<string>\('SUPABASE_URL'\)/g, "this.configService.get<string>('SUPABASE_URL') as string");
    content = content.replace(/throw new BadRequestException/g, "throw new common_1.BadRequestException");
    if (!content.includes('import * as common_1 from "@nestjs/common"')) {
      content = 'import * as common_1 from "@nestjs/common";\n' + content;
    }
  }

  if (file.includes('planning.controller.ts')) {
    content = content.replace(/user\.schoolId/g, "(user.activeSchoolId || user.schoolId) as string");
  }

  if (file.includes('teachers.service.ts')) {
    content = content.replace(/where: \{ schoolId: teacher\.schoolId, active: true \}/g, "where: { schoolId: teacher.schoolId as string, active: true }");
  }

  if (file.includes('auth.service.ts')) {
    // let school: { name: string; type: SchoolType } | null = null;
    content = content.replace(/let school = null;/g, "let school: any = null;");
    content = content.replace(/organizationSchools = await/g, "organizationSchools = (await");
    // wait, in auth.service it says:
    // 64: school = await tx.school.findUnique({
    // 115: school = await tx.school.findUnique({
    content = content.replace(/let school = null/g, "let school: any = null");
    content = content.replace(/let organizationSchools;/g, "let organizationSchools: any[] = [];");
    content = content.replace(/organizationSchools = await this\.prisma\.school/g, "organizationSchools = await this.prisma.school");
    content = content.replace(/let schoolName = null;/g, "let schoolName: string | undefined = undefined;");
  }

  fs.writeFileSync(file, content, 'utf8');
});
