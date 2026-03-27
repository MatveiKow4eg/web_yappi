"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = publicOrdersRoutes;
const prisma_1 = require("../../lib/prisma");
const session_1 = require("../../lib/session");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const OrderSchema = zod_1.z.object({
    type: zod_1.z.enum(["delivery", "pickup"]),
    payment_method: zod_1.z.enum(["stripe", "cash_on_pickup", "card_on_pickup", "cash_on_delivery", "card_on_delivery"]),
    customer_name: zod_1.z.string().min(2),
    customer_phone: zod_1.z.string().min(7),
    address_line: zod_1.z.string().optional(),
    apartment: zod_1.z.string().optional(),
    entrance: zod_1.z.string().optional(),
    floor: zod_1.z.string().optional(),
    door_code: zod_1.z.string().optional(),
    comment: zod_1.z.string().optional(),
    promo_code: zod_1.z.string().optional(),
    language_code: zod_1.z.enum(["ru", "en", "et"]).default("ru"),
    delivery_zone_id: zod_1.z.string().optional(),
    items: zod_1.z.array(zod_1.z.object({
        product_id: zod_1.z.string(),
        product_variant_id: zod_1.z.string().optional(),
        quantity: zod_1.z.number().int().positive(),
        selections: zod_1.z.array(zod_1.z.object({
            option_item_id: zod_1.z.string(),
            quantity: zod_1.z.number().int().positive().default(1),
        })).default([]),
    })).min(1),
});
async function publicOrdersRoutes(app) {
    // POST /api/orders
    app.post("/orders", async (req, reply) => {
        const parsed = OrderSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, session_1.err)(reply, parsed.error.message);
        const body = parsed.data;
        if (body.type === "delivery" && !body.address_line) {
            return (0, session_1.err)(reply, "Адрес доставки обязателен", 422);
        }
        // Resolve items
        let subtotal = 0;
        const resolvedItems = [];
        for (const item of body.items) {
            const product = await prisma_1.prisma.product.findUnique({
                where: { id: item.product_id },
                select: {
                    id: true,
                    name_ru: true,
                    is_active: true,
                    is_available: true,
                    base_price: true,
                    variants: true,
                    option_links: { include: { option_group: { include: { items: true } } } },
                },
            });
            if (!product || !product.is_active)
                return (0, session_1.err)(reply, `Товар не найден: ${item.product_id}`, 422);
            if (!product.is_available)
                return (0, session_1.err)(reply, `Товар недоступен: ${product.name_ru}`, 422);
            let unitPrice = parseFloat(product.base_price.toString());
            let variantName;
            if (item.product_variant_id) {
                const variant = product.variants.find((v) => v.id === item.product_variant_id);
                if (!variant)
                    return (0, session_1.err)(reply, `Вариант не найден`, 422);
                unitPrice = parseFloat(variant.price.toString());
                variantName = variant.name_ru;
            }
            // Resolve selections
            const resolvedSelections = [];
            for (const sel of item.selections) {
                let optionItem = null;
                let groupName = "";
                for (const link of product.option_links) {
                    const found = link.option_group.items.find((i) => i.id === sel.option_item_id);
                    if (found) {
                        optionItem = found;
                        groupName = link.option_group.name_ru;
                        break;
                    }
                }
                if (!optionItem)
                    return (0, session_1.err)(reply, `Опция не найдена: ${sel.option_item_id}`, 422);
                const delta = parseFloat(optionItem.price_delta.toString());
                unitPrice += delta;
                resolvedSelections.push({
                    option_item_id: sel.option_item_id,
                    option_group_name_snapshot: groupName,
                    option_item_name_snapshot: optionItem.name_ru,
                    price_delta: delta,
                    quantity: sel.quantity,
                });
            }
            const lineTotal = unitPrice * item.quantity;
            subtotal += lineTotal;
            resolvedItems.push({
                product_id: item.product_id,
                product_variant_id: item.product_variant_id,
                product_name_snapshot: product.name_ru,
                variant_name_snapshot: variantName,
                unit_price: unitPrice,
                quantity: item.quantity,
                line_total: lineTotal,
                selections: resolvedSelections,
            });
        }
        // Delivery fee
        let deliveryFee = 0;
        let zoneId;
        if (body.type === "delivery" && body.delivery_zone_id) {
            const zone = await prisma_1.prisma.deliveryZone.findUnique({ where: { id: body.delivery_zone_id } });
            if (!zone || !zone.is_active)
                return (0, session_1.err)(reply, "Зона доставки не найдена", 422);
            // ✅ Check minimum order amount for delivery zone
            if (subtotal < parseFloat(zone.min_order_amount.toString())) {
                return (0, session_1.err)(reply, `Минимальная сумма заказа: ${zone.min_order_amount} EUR`, 422);
            }
            deliveryFee = parseFloat(zone.delivery_fee.toString());
            if (zone.free_delivery_from && subtotal >= parseFloat(zone.free_delivery_from.toString())) {
                deliveryFee = 0;
            }
            zoneId = zone.id;
        }
        // Promo code
        let discountAmount = 0;
        let promoCodeId;
        if (body.promo_code) {
            const promo = await prisma_1.prisma.promoCode.findFirst({
                where: {
                    code: body.promo_code.toUpperCase(),
                    is_active: true,
                    OR: [{ valid_from: null }, { valid_from: { lte: new Date() } }],
                    AND: [{ OR: [{ valid_to: null }, { valid_to: { gte: new Date() } }] }],
                },
            });
            if (!promo) {
                return (0, session_1.err)(reply, "Промокод неверный или истёк", 422);
            }
            // ✅ Check usage limits
            if (promo.usage_limit_total) {
                const totalUsage = await prisma_1.prisma.promoCodeUsage.count({
                    where: { promo_code_id: promo.id },
                });
                if (totalUsage >= promo.usage_limit_total) {
                    return (0, session_1.err)(reply, "Промокод больше не может использоваться", 422);
                }
            }
            if (promo.usage_limit_per_phone) {
                const phoneUsage = await prisma_1.prisma.promoCodeUsage.count({
                    where: {
                        promo_code_id: promo.id,
                        phone: body.customer_phone,
                    },
                });
                if (phoneUsage >= promo.usage_limit_per_phone) {
                    return (0, session_1.err)(reply, "Вы уже использовали этот промокод максимальное количество раз", 422);
                }
            }
            // ✅ Check minimum order amount for promo
            if (promo.min_order_amount && subtotal < parseFloat(promo.min_order_amount.toString())) {
                return (0, session_1.err)(reply, `Минимальная сумма для промокода: ${promo.min_order_amount} EUR`, 422);
            }
            discountAmount = promo.discount_type === "percent"
                ? (subtotal * parseFloat(promo.discount_value.toString())) / 100
                : parseFloat(promo.discount_value.toString());
            if (promo.max_discount_amount) {
                discountAmount = Math.min(discountAmount, parseFloat(promo.max_discount_amount.toString()));
            }
            promoCodeId = promo.id;
        }
        const totalAmount = Math.max(0, subtotal + deliveryFee - discountAmount);
        const orderNumber = `YS-${Date.now().toString(36).toUpperCase()}`;
        const trackingToken = (0, uuid_1.v4)();
        const order = await prisma_1.prisma.order.create({
            data: {
                order_number: orderNumber,
                tracking_token: trackingToken,
                type: body.type,
                status: "new",
                payment_method: body.payment_method,
                payment_status: "pending",
                customer_name: body.customer_name,
                customer_phone: body.customer_phone,
                address_line: body.address_line,
                apartment: body.apartment,
                entrance: body.entrance,
                floor: body.floor,
                door_code: body.door_code,
                comment: body.comment,
                language_code: body.language_code,
                subtotal_amount: subtotal,
                delivery_fee: deliveryFee,
                discount_amount: discountAmount,
                total_amount: totalAmount,
                currency: "EUR",
                promo_code_id: promoCodeId,
                delivery_zone_id: zoneId,
                items: {
                    create: resolvedItems.map((item) => ({
                        product_id: item.product_id,
                        product_variant_id: item.product_variant_id,
                        product_name_snapshot: item.product_name_snapshot,
                        variant_name_snapshot: item.variant_name_snapshot,
                        unit_price: item.unit_price,
                        quantity: item.quantity,
                        line_total: item.line_total,
                        selections: { create: item.selections },
                    })),
                },
            },
        });
        if (promoCodeId) {
            await prisma_1.prisma.promoCodeUsage.create({
                data: {
                    promo_code_id: promoCodeId,
                    order_id: order.id,
                    phone: body.customer_phone,
                    discount_amount: discountAmount,
                },
            });
        }
        return reply.code(201).send({
            ok: true,
            data: {
                order_number: order.order_number,
                tracking_token: order.tracking_token,
                total_amount: totalAmount,
            },
        });
    });
    // GET /api/orders/track/:token
    app.get("/orders/track/:token", async (req, reply) => {
        const order = await prisma_1.prisma.order.findFirst({
            where: { tracking_token: req.params.token },
            include: {
                items: { include: { selections: true } },
            },
        });
        if (!order)
            return (0, session_1.err)(reply, "Заказ не найден", 404);
        return (0, session_1.ok)(reply, order);
    });
}
