"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = publicBannersRoutes;
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
async function publicBannersRoutes(app) {
    app.get("/banners", async (req, reply) => {
        const now = new Date();
        const banners = await prisma_1.prisma.banner.findMany({
            where: {
                is_active: true,
                OR: [{ starts_at: null }, { starts_at: { lte: now } }],
                AND: [{ OR: [{ ends_at: null }, { ends_at: { gte: now } }] }],
            },
            orderBy: { sort_order: "asc" },
        });
        return (0, session_1.ok)(reply, banners);
    });
}
