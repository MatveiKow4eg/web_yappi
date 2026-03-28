import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;

  // ─── Restaurant Settings ───
  await prisma.restaurantSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      restaurant_name: "Yappi Sushi",
      phone: "+372 5555 1234",
      email: "info@yappis.ee",
      address_ru: "Таллин, ул. Примерная 1",
      address_en: "Tallinn, Example St 1",
      address_et: "Tallinn, Näidis tänav 1",
      pickup_enabled: true,
      delivery_enabled: true,
      stripe_enabled: false,
      cash_on_pickup_enabled: true,
      card_on_pickup_enabled: true,
      min_delivery_time_minutes: 30,
      max_delivery_time_minutes: 60,
      working_hours_json: {
        mon: { open: "11:00", close: "22:00" },
        tue: { open: "11:00", close: "22:00" },
        wed: { open: "11:00", close: "22:00" },
        thu: { open: "11:00", close: "22:00" },
        fri: { open: "11:00", close: "23:00" },
        sat: { open: "12:00", close: "23:00" },
        sun: { open: "12:00", close: "22:00" },
      },
    },
  });

  // ─── Admin User ───
  if (seedAdminEmail && seedAdminPassword) {
    const adminExists = await prisma.adminUser.findUnique({
      where: { email: seedAdminEmail },
    });

    if (!adminExists) {
      await prisma.adminUser.create({
        data: {
          email: seedAdminEmail,
          password_hash: await hash(seedAdminPassword, 12),
          full_name: "Super Admin",
          role: "admin",
          is_active: true,
        },
      });
      console.log(`✅ Admin user created: ${seedAdminEmail}`);
    }
  } else {
    console.log("ℹ️  Seed admin user skipped (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one)");
  }

  // ─── Categories ───
  const categories = [
    { slug: "rolls", name_ru: "Роллы", name_en: "Rolls", name_et: "Rullid", sort_order: 1 },
    { slug: "sushi", name_ru: "Суши", name_en: "Sushi", name_et: "Sushi", sort_order: 2 },
    { slug: "sets", name_ru: "Сеты", name_en: "Sets", name_et: "Setid", sort_order: 3 },
    { slug: "soups", name_ru: "Супы", name_en: "Soups", name_et: "Supid", sort_order: 4 },
    { slug: "drinks", name_ru: "Напитки", name_en: "Drinks", name_et: "Joogid", sort_order: 5 },
    { slug: "sauces", name_ru: "Соусы", name_en: "Sauces", name_et: "Kastmed", sort_order: 6 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log("✅ Categories seeded");

  // ─── Option Groups ───
  const chopsticks = await prisma.productOptionGroup.upsert({
    where: { id: "og-chopsticks" },
    update: {},
    create: {
      id: "og-chopsticks",
      name_ru: "Палочки",
      name_en: "Chopsticks",
      name_et: "Söögipulgad",
      type: "quantity",
      is_required: false,
      sort_order: 1,
      items: {
        create: [
          { name_ru: "1 комплект", name_en: "1 set", name_et: "1 komplekt", price_delta: 0, sort_order: 1 },
          { name_ru: "2 комплекта", name_en: "2 sets", name_et: "2 komplekti", price_delta: 0, sort_order: 2 },
          { name_ru: "3 комплекта", name_en: "3 sets", name_et: "3 komplekti", price_delta: 0, sort_order: 3 },
        ],
      },
    },
  });

  await prisma.productOptionGroup.upsert({
    where: { id: "og-wasabi" },
    update: {},
    create: {
      id: "og-wasabi",
      name_ru: "Васаби",
      name_en: "Wasabi",
      name_et: "Vasabi",
      type: "single",
      is_required: false,
      sort_order: 2,
      items: {
        create: [
          { name_ru: "Без васаби", name_en: "No wasabi", name_et: "Ilma vasabita", price_delta: 0, sort_order: 1 },
          { name_ru: "С васаби", name_en: "With wasabi", name_et: "Vasabiga", price_delta: 0, sort_order: 2 },
        ],
      },
    },
  });

  await prisma.productOptionGroup.upsert({
    where: { id: "og-ginger" },
    update: {},
    create: {
      id: "og-ginger",
      name_ru: "Имбирь",
      name_en: "Ginger",
      name_et: "Ingver",
      type: "single",
      is_required: false,
      sort_order: 3,
      items: {
        create: [
          { name_ru: "Без имбиря", name_en: "No ginger", name_et: "Ilma ingverita", price_delta: 0, sort_order: 1 },
          { name_ru: "С имбирём", name_en: "With ginger", name_et: "Ingveriga", price_delta: 0, sort_order: 2 },
        ],
      },
    },
  });

  console.log("✅ Option groups seeded");

  // ─── Sample Products ───
  const rollsCat = await prisma.category.findUnique({ where: { slug: "rolls" } });
  const setCat = await prisma.category.findUnique({ where: { slug: "sets" } });

  if (rollsCat) {
    const products = [
      {
        slug: "california-roll",
        name_ru: "Калифорния",
        name_en: "California Roll",
        name_et: "California rull",
        description_ru: "Краб, авокадо, огурец, икра тобико",
        description_en: "Crab, avocado, cucumber, tobiko caviar",
        description_et: "Krabi, avokaado, kurk, tobiko kaaviar",
        base_price: 8.5,
        sort_order: 1,
        category_id: rollsCat.id,
      },
      {
        slug: "philadelphia-roll",
        name_ru: "Филадельфия",
        name_en: "Philadelphia Roll",
        name_et: "Philadelphia rull",
        description_ru: "Лосось, сливочный сыр, огурец",
        description_en: "Salmon, cream cheese, cucumber",
        description_et: "Lõhe, toorjuust, kurk",
        base_price: 9.5,
        sort_order: 2,
        category_id: rollsCat.id,
      },
      {
        slug: "dragon-roll",
        name_ru: "Дракон",
        name_en: "Dragon Roll",
        name_et: "Draakon rull",
        description_ru: "Угорь, огурец, авокадо, соус унаги",
        description_en: "Eel, cucumber, avocado, unagi sauce",
        description_et: "Angerjas, kurk, avokaado, unagi kaste",
        base_price: 11.0,
        sort_order: 3,
        category_id: rollsCat.id,
      },
    ];

    for (const p of products) {
      await prisma.product.upsert({
        where: { slug: p.slug },
        update: {},
        create: {
          ...p,
          is_active: true,
          is_available: true,
          option_links: {
            create: [
              { option_group_id: "og-chopsticks" },
              { option_group_id: "og-wasabi" },
              { option_group_id: "og-ginger" },
            ],
          },
        },
      });
    }
    console.log("✅ Sample products seeded");
  }

  // ─── Delivery Zone ───
  await prisma.deliveryZone.upsert({
    where: { id: "zone-city" },
    update: {},
    create: {
      id: "zone-city",
      name: "Центр города",
      delivery_fee: 2.5,
      min_order_amount: 15,
      free_delivery_from: 30,
      is_active: true,
    },
  });
  console.log("✅ Delivery zone seeded");

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
