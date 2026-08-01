import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'PARENT' },
    include: {
      parentProfile: {
        include: {
          studentLinks: {
            include: {
              studentProfile: {
                include: { user: true }
              }
            }
          }
        }
      }
    }
  });
  console.log(JSON.stringify(users, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
