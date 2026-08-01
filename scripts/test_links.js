const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const links = await prisma.parentStudent.findMany();
  console.log("Total links:", links.length);
  console.log(links);
}
main().finally(() => prisma.$disconnect());
