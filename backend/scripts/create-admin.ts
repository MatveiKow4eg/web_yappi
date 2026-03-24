import { PrismaClient } from "@prisma/client";
import { hash } from "argon2";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || "admin@yappisushi.ee";
  const password = process.argv[3] || "YappiAdmin2026!";

  // Check if admin exists
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists!`);
    return;
  }

  const hashedPassword = await hash(password);

  const admin = await prisma.adminUser.create({
    data: {
      email,
      password_hash: hashedPassword,
      full_name: "Main Admin",
    },
  });

  console.log("✅ Admin user created successfully!");
  console.log(`📧 Email: ${admin.email}`);
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
