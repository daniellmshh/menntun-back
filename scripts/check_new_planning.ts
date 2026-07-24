import { PrismaClient } from "@prisma/client";

async function run() {
  const prisma = new PrismaClient();
  const p = await prisma.planning.findUnique({
    where: { id: "7b618929-2f8b-4b79-8f9e-4247ed447a38" }
  });
  console.log(JSON.stringify(p?.matrizDidactica, null, 2));
}

run();
