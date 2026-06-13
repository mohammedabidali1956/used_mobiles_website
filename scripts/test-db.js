const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const brands = await prisma.brand.findMany();

  console.log("Database connection successful");
  console.log(brands);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

