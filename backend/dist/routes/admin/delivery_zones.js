"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminDeliveryZonesRoutes;
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
const zod_1 = require("zod");
const DeliveryZoneSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    delivery_fee: zod_1.z.number().or(zod_1.z.string()).transform(v => parseFloat(String(v))),
    min_order_amount: zod_1.z.number().or(zod_1.z.string()).transform(v => parseFloat(String(v))).default(0),
    free_delivery_from: zod_1.z.number().or(zod_1.z.string()).optional().transform(v => v ? parseFloat(String(v)) : null),
    is_active: zod_1.z.boolean().default(true),
});
async function adminDeliveryZonesRoutes(app) {
    // GET /api/admin/delivery-zones
    app.get("/delivery-zones", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin"]))
            return;
        const zones = await prisma_1.prisma.deliveryZone.findMany({
            orderBy: { name: "asc" },
        });
        return (0, session_1.ok)(reply, zones);
    });
    // POST /api/admin/delivery-zones
    app.post("/delivery-zones", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin"]))
            return;
        const parsed = DeliveryZoneSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const zone = await prisma_1.prisma.deliveryZone.create({
            data: {
                name: parsed.data.name,
                delivery_fee: parsed.data.delivery_fee,
                min_order_amount: parsed.data.min_order_amount,
                free_delivery_from: parsed.data.free_delivery_from,
                is_active: parsed.data.is_active,
            },
        });
        return (0, session_1.ok)(reply, zone, 201);
    });
    // PATCH /api/admin/delivery-zones/:id
    app.patch("/delivery-zones/:id", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin"]))
            return;
        const { id } = req.params;
        const parsed = DeliveryZoneSchema.partial().safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const zone = await prisma_1.prisma.deliveryZone.update({
            where: { id },
            data: {
                ...(parsed.data.name !== undefined && { name: parsed.data.name }),
                ...(parsed.data.delivery_fee !== undefined && { delivery_fee: parsed.data.delivery_fee }),
                ...(parsed.data.min_order_amount !== undefined && { min_order_amount: parsed.data.min_order_amount }),
                ...(parsed.data.free_delivery_from !== undefined && { free_delivery_from: parsed.data.free_delivery_from }),
                ...(parsed.data.is_active !== undefined && { is_active: parsed.data.is_active }),
            },
        });
        return (0, session_1.ok)(reply, zone);
    });
    // DELETE /api/admin/delivery-zones/:id
    app.delete("/delivery-zones/:id", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        if (!(0, session_1.requireRoles)(session, reply, ["admin"]))
            return;
        const { id } = req.params;
        await prisma_1.prisma.deliveryZone.delete({
            where: { id },
        });
        return (0, session_1.ok)(reply, { id });
    });
}
