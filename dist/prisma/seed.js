"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding initial data...');
    const school = await prisma.school.upsert({
        where: { code: 'DEMO-001' },
        update: {},
        create: {
            name: 'Colegio Demo',
            code: 'DEMO-001',
            address: 'Calle Principal 123',
            phone: '555-0000',
            email: 'admin@colegiodemo.edu',
            active: true,
        },
    });
    console.log('School created:', school.name);
    const modules = [
        'academic',
        'students',
        'teachers',
        'parents',
        'attendance',
        'grades',
        'tasks',
        'communications',
        'planning',
        'enrollments',
        'scholarships',
        'reports',
    ];
    for (const module of modules) {
        await prisma.schoolModule.upsert({
            where: {
                schoolId_module: {
                    schoolId: school.id,
                    module,
                },
            },
            update: { active: true },
            create: {
                schoolId: school.id,
                module,
                active: true,
            },
        });
    }
    console.log('All modules activated for demo school');
    const schoolYear = await prisma.schoolYear.upsert({
        where: {
            id: 'seed-year-2025',
        },
        update: {},
        create: {
            id: 'seed-year-2025',
            schoolId: school.id,
            name: 'Ciclo 2024-2025',
            startDate: new Date('2024-08-01'),
            endDate: new Date('2025-06-30'),
            active: true,
        },
    });
    console.log('School year created:', schoolYear.name);
    const periods = [
        { name: 'Primer Bimestre', order: 1, start: '2024-08-01', end: '2024-10-04' },
        { name: 'Segundo Bimestre', order: 2, start: '2024-10-07', end: '2024-12-13' },
        { name: 'Tercer Bimestre', order: 3, start: '2025-01-06', end: '2025-03-14' },
        { name: 'Cuarto Bimestre', order: 4, start: '2025-03-17', end: '2025-05-23' },
        { name: 'Quinto Bimestre', order: 5, start: '2025-05-26', end: '2025-06-30' },
    ];
    for (const p of periods) {
        await prisma.period.upsert({
            where: {
                id: `seed-period-${p.order}`,
            },
            update: {},
            create: {
                id: `seed-period-${p.order}`,
                schoolYearId: schoolYear.id,
                name: p.name,
                order: p.order,
                startDate: new Date(p.start),
                endDate: new Date(p.end),
            },
        });
    }
    console.log('Periods created: 5 bimestres');
    const gradeNames = [
        { name: '1° Grado', order: 1, level: 'PRIMARIA' },
        { name: '2° Grado', order: 2, level: 'PRIMARIA' },
        { name: '3° Grado', order: 3, level: 'PRIMARIA' },
        { name: '4° Grado', order: 4, level: 'PRIMARIA' },
        { name: '5° Grado', order: 5, level: 'PRIMARIA' },
        { name: '6° Grado', order: 6, level: 'PRIMARIA' },
    ];
    for (const g of gradeNames) {
        await prisma.grade.upsert({
            where: {
                schoolId_name: {
                    schoolId: school.id,
                    name: g.name,
                },
            },
            update: {},
            create: {
                schoolId: school.id,
                name: g.name,
                order: g.order,
                level: g.level,
            },
        });
    }
    console.log('Grades created: 6 grados de primaria');
    console.log('Seed completed successfully');
}
main()
    .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map