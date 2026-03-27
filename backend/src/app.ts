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
import stripeWebhookRoutes from "./routes/public/stripe";
import adminAuthRoutes from "./routes/admin/auth";
import adminMeRoutes from "./routes/admin/me";
import adminOrdersRoutes from "./routes/admin/orders";
import adminProductsRoutes from "./routes/admin/products";
import adminCategoriesRoutes from "./routes/admin/categories";
import adminSettingsRoutes from "./routes/admin/settings";
import adminKitchenRoutes from "./routes/admin/kitchen";
import adminBannersRoutes from "./routes/admin/banners";
import adminDeliveryZonesRoutes from "./routes/admin/delivery_zones";
import adminPromoCodesRoutes from "./routes/admin/promo_codes";

const app = Fastify({ logger: true });

const start = async () => {
  // ─── RAW BODY PARSER ────────────────────────────────────────
  // Stripe webhook verification requires the raw request body.
  // This replaces Fastify's built-in JSON parser: we save the raw Buffer on req,
  // then still parse JSON so all other routes work normally.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      (req as any).rawBody = body;
      try {
        done(null, JSON.parse((body as Buffer).toString("utf8")));
      } catch (err: any) {
        err.statusCode = 400;
        done(err, undefined);
      }
    }
  );

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
    secret: process.env.JWT_SECRET,
  });

  // ─── HEALTH CHECK ───────────────────────────────────────────
  app.get("/health", async () => ({ ok: true, ts: new Date().toISOString() }));

  // ─── PUBLIC ROUTES ──────────────────────────────────────────
  app.register(publicCategoriesRoutes, { prefix: "/api" });
  app.register(publicProductsRoutes, { prefix: "/api" });
  app.register(publicBannersRoutes, { prefix: "/api" });
  app.register(publicOrdersRoutes, { prefix: "/api" });
  app.register(publicPromoRoutes, { prefix: "/api" });
  app.register(stripeWebhookRoutes, { prefix: "/api" });

  // ─── ADMIN ROUTES ───────────────────────────────────────────
  app.register(adminAuthRoutes, { prefix: "/api/admin" });
  app.register(adminMeRoutes, { prefix: "/api/admin" });
  app.register(adminOrdersRoutes, { prefix: "/api/admin" });
  app.register(adminProductsRoutes, { prefix: "/api/admin" });
  app.register(adminCategoriesRoutes, { prefix: "/api/admin" });
  app.register(adminSettingsRoutes, { prefix: "/api/admin" });
  app.register(adminKitchenRoutes, { prefix: "/api/admin" });
  app.register(adminBannersRoutes, { prefix: "/api/admin" });
  app.register(adminDeliveryZonesRoutes, { prefix: "/api/admin" });
  app.register(adminPromoCodesRoutes, { prefix: "/api/admin" });

  // ─── START ──────────────────────────────────────────────────
  const PORT = parseInt(process.env.PORT ?? "4000", 10);

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`\n🍣 Yappi Sushi API running on http://localhost:${PORT}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
