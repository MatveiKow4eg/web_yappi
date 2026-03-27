import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { ok, err } from "../../lib/session";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";
import { createHash } from "crypto";

const STRIPE_ORDER_REUSE_WINDOW_MS = 30 * 60 * 1000;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

function buildCheckoutFingerprint(input: {
  type: "delivery" | "pickup";
  payment_method: "stripe" | "cash_on_pickup" | "card_on_pickup" | "cash_on_delivery" | "card_on_delivery";
  customer_name: string;
  customer_phone: string;
  address_line?: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  door_code?: string;
  comment?: string;
  promo_code?: string;
  language_code: "ru" | "en" | "et";
  delivery_zone_id?: string;
  total_amount: number;
  items: Array<{
    product_id: string;
    product_variant_id?: string;
    quantity: number;
    selections: Array<{
      option_item_id: string;
      quantity: number;
    }>;
  }>;
}): string {
  const normalized = {
    ...input,
    promo_code: input.promo_code?.toUpperCase() ?? null,
    items: input.items
      .map((item) => ({
        ...item,
        product_variant_id: item.product_variant_id ?? null,
        selections: item.selections
          .map((selection) => ({
            option_item_id: selection.option_item_id,
            quantity: selection.quantity,
          }))
          .sort((a, b) => `${a.option_item_id}:${a.quantity}`.localeCompare(`${b.option_item_id}:${b.quantity}`)),
      }))
      .sort((a, b) => `${a.product_id}:${a.product_variant_id ?? ""}`.localeCompare(`${b.product_id}:${b.product_variant_id ?? ""}`)),
  };

  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

const OrderSchema = z.object({
  type: z.enum(["delivery", "pickup"]),
  payment_method: z.enum(["stripe", "cash_on_pickup", "card_on_pickup", "cash_on_delivery", "card_on_delivery"]),
  customer_name: z.string().min(2),
  customer_phone: z.string().min(7),
  address_line: z.string().optional(),
  apartment: z.string().optional(),
  entrance: z.string().optional(),
  floor: z.string().optional(),
  door_code: z.string().optional(),
  comment: z.string().optional(),
  promo_code: z.string().optional(),
  language_code: z.enum(["ru", "en", "et"]).default("ru"),
  delivery_zone_id: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string(),
    product_variant_id: z.string().optional(),
    quantity: z.number().int().positive(),
    selections: z.array(z.object({
      option_item_id: z.string(),
      quantity: z.number().int().positive().default(1),
    })).default([]),
  })).min(1),
});

export default async function publicOrdersRoutes(app: FastifyInstance) {
  // POST /api/orders
  app.post("/orders", async (req, reply) => {
    const parsed = OrderSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const body = parsed.data;

    if (body.type === "delivery" && !body.address_line) {
      return err(reply, "Адрес доставки обязателен", 422);
    }

    // Resolve items
    let subtotal = 0;
    const resolvedItems: Array<{
      product_id: string;
      product_variant_id?: string;
      product_name_snapshot: string;
      variant_name_snapshot?: string;
      unit_price: number;
      quantity: number;
      line_total: number;
      selections: Array<{
        option_item_id: string;
        option_group_name_snapshot: string;
        option_item_name_snapshot: string;
        price_delta: number;
        quantity: number;
      }>;
    }> = [];

    for (const item of body.items) {
      const product = await prisma.product.findUnique({
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
      if (!product || !product.is_active) return err(reply, `Товар не найден: ${item.product_id}`, 422);
      if (!product.is_available) return err(reply, `Товар недоступен: ${product.name_ru}`, 422);

      let unitPrice = parseFloat(product.base_price.toString());
      let variantName: string | undefined;

      if (item.product_variant_id) {
        const variant = product.variants.find((v) => v.id === item.product_variant_id);
        if (!variant) return err(reply, `Вариант не найден`, 422);
        unitPrice = parseFloat(variant.price.toString());
        variantName = variant.name_ru;
      }

      // Resolve selections
      const resolvedSelections: typeof resolvedItems[0]["selections"] = [];
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
        if (!optionItem) return err(reply, `Опция не найдена: ${sel.option_item_id}`, 422);
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
    let zoneId: string | undefined;
    if (body.type === "delivery" && body.delivery_zone_id) {
      const zone = await prisma.deliveryZone.findUnique({ where: { id: body.delivery_zone_id } });
      if (!zone || !zone.is_active) return err(reply, "Зона доставки не найдена", 422);
      
      // ✅ Check minimum order amount for delivery zone
      if (subtotal < parseFloat(zone.min_order_amount.toString())) {
        return err(reply, `Минимальная сумма заказа: ${zone.min_order_amount} EUR`, 422);
      }
      
      deliveryFee = parseFloat(zone.delivery_fee.toString());
      if (zone.free_delivery_from && subtotal >= parseFloat(zone.free_delivery_from.toString())) {
        deliveryFee = 0;
      }
      zoneId = zone.id;
    }

    // Promo code
    let discountAmount = 0;
    let promoCodeId: string | undefined;
    if (body.promo_code) {
      const promo = await prisma.promoCode.findFirst({
        where: {
          code: body.promo_code.toUpperCase(),
          is_active: true,
          OR: [{ valid_from: null }, { valid_from: { lte: new Date() } }],
          AND: [{ OR: [{ valid_to: null }, { valid_to: { gte: new Date() } }] }],
        },
      });
      
      if (!promo) {
        return err(reply, "Промокод неверный или истёк", 422);
      }
      
      // ✅ Check usage limits
      if (promo.usage_limit_total) {
        const totalUsage = await prisma.promoCodeUsage.count({
          where: { promo_code_id: promo.id },
        });
        if (totalUsage >= promo.usage_limit_total) {
          return err(reply, "Промокод больше не может использоваться", 422);
        }
      }
      
      if (promo.usage_limit_per_phone) {
        const phoneUsage = await prisma.promoCodeUsage.count({
          where: {
            promo_code_id: promo.id,
            phone: body.customer_phone,
          },
        });
        if (phoneUsage >= promo.usage_limit_per_phone) {
          return err(reply, "Вы уже использовали этот промокод максимальное количество раз", 422);
        }
      }
      
      // ✅ Check minimum order amount for promo
      if (promo.min_order_amount && subtotal < parseFloat(promo.min_order_amount.toString())) {
        return err(reply, `Минимальная сумма для промокода: ${promo.min_order_amount} EUR`, 422);
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

    // Stripe Checkout does not support zero-amount payment sessions.
    // Force such orders to use a non-Stripe payment method instead of creating a broken flow.
    if (body.payment_method === "stripe" && totalAmount <= 0) {
      return err(reply, "Онлайн-оплата недоступна для заказа с нулевой суммой", 422);
    }

    if (body.payment_method === "stripe") {
      const settings = await prisma.restaurantSettings.findFirst({
        select: { stripe_enabled: true },
      });

      if (!settings?.stripe_enabled) {
        req.log.warn("Stripe checkout blocked: stripe_enabled is false");
        return err(reply, "Онлайн-оплата отключена в настройках ресторана", 422);
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        req.log.error("Stripe checkout blocked: STRIPE_SECRET_KEY is missing");
        return err(reply, "Интернет-платеж временно недоступен: платежный сервис не настроен на сервере", 422);
      }
    }

    // ─── Compute checkout fingerprint for ALL payment methods ────────────────
    // This detects duplicate orders within 30 minutes regardless of payment method.
    const checkoutFingerprint = buildCheckoutFingerprint({
      type: body.type,
      payment_method: body.payment_method,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone,
      address_line: body.address_line,
      apartment: body.apartment,
      entrance: body.entrance,
      floor: body.floor,
      door_code: body.door_code,
      comment: body.comment,
      promo_code: body.promo_code,
      language_code: body.language_code,
      delivery_zone_id: body.delivery_zone_id,
      total_amount: totalAmount,
      items: body.items,
    });

    // ─── Check for duplicate orders (applies to ALL payment methods) ──────────
    // Prevents accidental duplicate orders from API retries within 30 minutes.
    const existingOrder = await prisma.order.findFirst({
      where: {
        payment_method: body.payment_method,
        payment_status: "pending",
        status: { not: "cancelled" },
        checkout_fingerprint: checkoutFingerprint,
        created_at: { gte: new Date(Date.now() - STRIPE_ORDER_REUSE_WINDOW_MS) },
      },
      orderBy: { created_at: "desc" },
    });

    // ─── Stripe-specific session handling ────────────────────────────────────
    if (body.payment_method === "stripe" && existingOrder?.stripe_session_id) {
      const stripe = getStripe();
      const existingSession = await stripe.checkout.sessions.retrieve(existingOrder.stripe_session_id);

      if (existingSession.status === "open" && existingSession.payment_status === "unpaid" && existingSession.url) {
        return reply.code(200).send({
          ok: true,
          data: {
            order_number: existingOrder.order_number,
            tracking_token: existingOrder.tracking_token,
            total_amount: parseFloat(existingOrder.total_amount.toString()),
            payment_status: existingOrder.payment_status,
            stripe_checkout_url: existingSession.url,
          },
        });
      }

      if (existingSession.status === "complete" && existingSession.payment_status === "paid") {
        return reply.code(200).send({
          ok: true,
          data: {
            order_number: existingOrder.order_number,
            tracking_token: existingOrder.tracking_token,
            total_amount: parseFloat(existingOrder.total_amount.toString()),
            payment_status: existingOrder.payment_status,
          },
        });
      }

      if (existingSession.status === "expired") {
        await prisma.order.update({
          where: { id: existingOrder.id },
          data: { payment_status: "failed" },
        });
      }
    }

    // ─── Non-Stripe duplicate: return existing pending order ──────────────────
    if (body.payment_method !== "stripe" && existingOrder) {
      return reply.code(200).send({
        ok: true,
        data: {
          order_number: existingOrder.order_number,
          tracking_token: existingOrder.tracking_token,
          total_amount: parseFloat(existingOrder.total_amount.toString()),
          payment_status: existingOrder.payment_status,
        },
      });
    }

    const orderNumber = `YS-${Date.now().toString(36).toUpperCase()}`;
    const trackingToken = uuidv4();

    const order = await prisma.order.create({
      data: {
        order_number: orderNumber,
        tracking_token: trackingToken,
        type: body.type as "delivery" | "pickup",
        status: "new",
        payment_method: body.payment_method as "stripe" | "cash_on_pickup" | "card_on_pickup" | "cash_on_delivery" | "card_on_delivery",
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
        checkout_fingerprint: checkoutFingerprint,
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

    if (promoCodeId && body.payment_method !== "stripe") {
      await prisma.promoCodeUsage.create({
        data: {
          promo_code_id: promoCodeId,
          order_id: order.id,
          phone: body.customer_phone,
          discount_amount: discountAmount,
        },
      });
    }

    // ─── Stripe Checkout ────────────────────────────────────────
    if (body.payment_method === "stripe") {
      const configuredBaseUrl = process.env.BASE_URL?.trim();
      const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin.trim() : "";
      const baseUrl = configuredBaseUrl || requestOrigin;

      if (!baseUrl) {
        req.log.error("Stripe checkout: BASE_URL is missing and request origin is unavailable");
        return err(reply, "Не настроен публичный URL фронтенда для интернет-платежа", 500);
      }

      const stripe = getStripe();

      // Build line items from already-resolved server-side prices.
      // unit_price already includes all option/selection deltas — safe to use directly.
      const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
        resolvedItems.map((item) => ({
          price_data: {
            currency: "eur",
            unit_amount: Math.round(item.unit_price * 100),
            product_data: { name: item.product_name_snapshot },
          },
          quantity: item.quantity,
        }));

      if (deliveryFee > 0) {
        stripeLineItems.push({
          price_data: {
            currency: "eur",
            unit_amount: Math.round(deliveryFee * 100),
            product_data: { name: "Доставка" },
          },
          quantity: 1,
        });
      }

      // Discount as a Stripe coupon (negative line items are not supported in Checkout).
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: stripeLineItems,
        metadata: { orderId: order.id },
        // success_url: user is redirected here after successful payment.
        // ⚠️  paid=1 is cosmetic only — payment_status is set ONLY via webhook.
        success_url: `${baseUrl}/track/${order.tracking_token}?paid=1`,
        cancel_url: `${baseUrl}/checkout?cancelled=1`,
      };

      try {
        if (discountAmount > 0) {
          const coupon = await stripe.coupons.create({
            amount_off: Math.round(discountAmount * 100),
            currency: "eur",
            duration: "once",
          });
          sessionParams.discounts = [{ coupon: coupon.id }];
        }

        const session = await stripe.checkout.sessions.create(sessionParams, {
          idempotencyKey: `order_${order.id}`,
        });

        // Persist session id so webhook can resolve the order by orderId from metadata.
        await prisma.order.update({
          where: { id: order.id },
          data: { stripe_session_id: session.id },
        });

        return reply.code(201).send({
          ok: true,
          data: {
            order_number: order.order_number,
            tracking_token: order.tracking_token,
            total_amount: totalAmount,
            payment_status: order.payment_status,
            stripe_checkout_url: session.url,
          },
        });
      } catch (stripeError) {
        req.log.error({ err: stripeError, orderId: order.id }, "Failed to create Stripe Checkout Session");

        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "cancelled",
            payment_status: "failed",
            cancel_reason: "Не удалось инициализировать интернет-платеж",
            cancelled_at: new Date(),
          },
        });

        return err(reply, "Не удалось создать интернет-платеж. Попробуйте снова или выберите другой способ оплаты.", 502);
      }
    }

    // ─── Non-Stripe payment methods ─────────────────────────────
    return reply.code(201).send({
      ok: true,
      data: {
        order_number: order.order_number,
        tracking_token: order.tracking_token,
        total_amount: totalAmount,
        payment_status: order.payment_status,
      },
    });
  });

  // GET /api/orders/track/:token
  app.get<{ Params: { token: string } }>("/orders/track/:token", async (req, reply) => {
    const [order, settings] = await Promise.all([
      prisma.order.findFirst({
        where: { tracking_token: req.params.token },
        include: {
          items: { include: { selections: true } },
        },
      }),
      prisma.restaurantSettings.findFirst({
        select: { min_delivery_time_minutes: true, max_delivery_time_minutes: true },
      }),
    ]);
    if (!order) return err(reply, "Заказ не найден", 404);
    return ok(reply, {
      ...order,
      estimated_min_minutes: settings?.min_delivery_time_minutes ?? 30,
      estimated_max_minutes: settings?.max_delivery_time_minutes ?? 60,
    });
  });
}
