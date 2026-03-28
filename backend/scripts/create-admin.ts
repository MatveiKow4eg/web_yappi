import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const roleArg = (process.argv[4] || "admin").toLowerCase();
  const role = roleArg === "kitchen" ? "kitchen" : "admin";

  if (!email || !password) {
    console.log("Usage: npx ts-node scripts/create-admin.ts <email> <password> [admin|kitchen]");
    process.exit(1);
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists!`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.adminUser.create({
    data: {
      email,
      password_hash: hashedPassword,
      full_name: role === "kitchen" ? "Kitchen User" : "Admin User",
      role,
    },
  });

  console.log("✅ User created successfully!");
  console.log(`📧 Email: ${admin.email}`);
  console.log(`👤 Role: ${admin.role}`);
}

main()
  .catch((e) => {
    console.error("❌ Error creating user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });