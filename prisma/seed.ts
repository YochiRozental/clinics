import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ROOM_SEED } from "../src/lib/rooms";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const room of ROOM_SEED) {
    await prisma.room.upsert({
      where: { key: room.key },
      update: { name: room.name, description: room.description, isCombo: room.isCombo },
      create: room,
    });
  }

  const adminEmail = "admin@clinics.local";
  const adminPassword = "Admin12345!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "מנהל המערכת",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  console.log("Seed complete.");
  console.log(`Admin login -> email: ${adminEmail} | password: ${adminPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
