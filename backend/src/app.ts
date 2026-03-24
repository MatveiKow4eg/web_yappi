import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import "dotenv/config";

// Routes
import publicCategoriesRoutes from "./routes/public/categories";
import publicProductsRoutes from "./routes/public/products";
import publicBannersRoutes from "./routes/public/banners";
import publicOrdersRoutes from "./routes/public/orders";
import publicPromoRoutes from "./routes/public/promo";
import adminAuthRoutes from "./routes/admin/auth";
import adminMeRoutes from "./routes/admin/me";
import adminOrdersRoutes from "./routes/admin/orders";
import adminProductsRoutes from "./routes/admin/products";
import adminCategoriesRoutes from "./routes/admin/categories";
import adminSettingsRoutes from "./routes/admin/settings";

const app = Fastify({ logger: true });

// ─── CORS ───────────────────────────────────────────────────
const rawOrigins = process.env.ALLOWED_ORIGINS ?? "http://localhost:3000";
const allowedOrigins = rawOrigins.split(",").map((o) => o.trim());

await app.register(fastifyCors, {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

// ─── COOKIES ────────────────────────────────────────────────
await app.register(fastifyCookie, {
  secret: process.env.JWT_SECRET ?? "fallback-secret",
});

// ─── HEALTH CHECK ───────────────────────────────────────────
app.get("/health", async () => ({ ok: true, ts: new Date().toISOString() }));

// ─── PUBLIC ROUTES ──────────────────────────────────────────
app.register(publicCategoriesRoutes, { prefix: "/api" });
app.register(publicProductsRoutes, { prefix: "/api" });
app.register(publicBannersRoutes, { prefix: "/api" });
app.register(publicOrdersRoutes, { prefix: "/api" });
app.register(publicPromoRoutes, { prefix: "/api" });

// ─── ADMIN ROUTES ───────────────────────────────────────────
app.register(adminAuthRoutes, { prefix: "/api/admin" });
app.register(adminMeRoutes, { prefix: "/api/admin" });
app.register(adminOrdersRoutes, { prefix: "/api/admin" });
app.register(adminProductsRoutes, { prefix: "/api/admin" });
app.register(adminCategoriesRoutes, { prefix: "/api/admin" });
app.register(adminSettingsRoutes, { prefix: "/api/admin" });

// ─── START ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "4000", 10);

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`\n🍣 Yappi Sushi API running on http://localhost:${PORT}\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
