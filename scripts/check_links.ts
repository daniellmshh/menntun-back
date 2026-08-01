import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const links = await prisma.parentStudent.findMany({
    include: {
      parentProfile: {
        include: {
          user: true
        }
      },
      studentProfile: {
        include: {
          user: true
        }
      }
    }
  });
  console.dir(links, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
