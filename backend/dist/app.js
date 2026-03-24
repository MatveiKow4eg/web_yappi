"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const cors_1 = __importDefault(require("@fastify/cors"));
require("dotenv/config");
// Routes
const categories_1 = __importDefault(require("./routes/public/categories"));
const products_1 = __importDefault(require("./routes/public/products"));
const banners_1 = __importDefault(require("./routes/public/banners"));
const orders_1 = __importDefault(require("./routes/public/orders"));
const promo_1 = __importDefault(require("./routes/public/promo"));
const auth_1 = __importDefault(require("./routes/admin/auth"));
const me_1 = __importDefault(require("./routes/admin/me"));
const orders_2 = __importDefault(require("./routes/admin/orders"));
const products_2 = __importDefault(require("./routes/admin/products"));
const categories_2 = __importDefault(require("./routes/admin/categories"));
const settings_1 = __importDefault(require("./routes/admin/settings"));
const banners_2 = __importDefault(require("./routes/admin/banners"));
const delivery_zones_1 = __importDefault(require("./routes/admin/delivery_zones"));
const promo_codes_1 = __importDefault(require("./routes/admin/promo_codes"));
const app = (0, fastify_1.default)({ logger: true });
const start = async () => {
    // ─── CORS ───────────────────────────────────────────────────
    const rawOrigins = process.env.ALLOWED_ORIGINS ?? "http://localhost:3000";
    const allowedOrigins = rawOrigins.split(",").map((o) => o.trim());
    await app.register(cors_1.default, {
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    });
    // ─── COOKIES ────────────────────────────────────────────────
    await app.register(cookie_1.default, {
        secret: process.env.JWT_SECRET,
    });
    // ─── HEALTH CHECK ───────────────────────────────────────────
    app.get("/health", async () => ({ ok: true, ts: new Date().toISOString() }));
    // ─── PUBLIC ROUTES ──────────────────────────────────────────
    app.register(categories_1.default, { prefix: "/api" });
    app.register(products_1.default, { prefix: "/api" });
    app.register(banners_1.default, { prefix: "/api" });
    app.register(orders_1.default, { prefix: "/api" });
    app.register(promo_1.default, { prefix: "/api" });
    // ─── ADMIN ROUTES ───────────────────────────────────────────
    app.register(auth_1.default, { prefix: "/api/admin" });
    app.register(me_1.default, { prefix: "/api/admin" });
    app.register(orders_2.default, { prefix: "/api/admin" });
    app.register(products_2.default, { prefix: "/api/admin" });
    app.register(categories_2.default, { prefix: "/api/admin" });
    app.register(settings_1.default, { prefix: "/api/admin" });
    app.register(banners_2.default, { prefix: "/api/admin" });
    app.register(delivery_zones_1.default, { prefix: "/api/admin" });
    app.register(promo_codes_1.default, { prefix: "/api/admin" });
    // ─── START ──────────────────────────────────────────────────
    const PORT = parseInt(process.env.PORT ?? "4000", 10);
    try {
        await app.listen({ port: PORT, host: "0.0.0.0" });
        app.log.info(`\n🍣 Yappi Sushi API running on http://localhost:${PORT}\n`);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
