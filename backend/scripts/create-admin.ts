import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || "admin@yappisushi.ee";
  const password = process.argv[3] || "YappiAdmin2026!";
  const roleArg = (process.argv[4] || "admin").toLowerCase();
  const role = roleArg === "kitchen" ? "kitchen" : "admin";

  // Check if admin exists
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists!`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.adminUser.create({
    data: {
      email,
      password_hash: hashedPassword,
      full_name: "Main Admin",
      role,
    },
  });

  console.log("✅ Admin user created successfully!");
  console.log(`📧 Email: ${admin.email}`);
  console.log(`👤 Role: ${admin.role}`);
  console.log(`🔑 Password: ${password}`);
}

main()
  .catch((e) => {
    console.error("❌ Error creating admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
