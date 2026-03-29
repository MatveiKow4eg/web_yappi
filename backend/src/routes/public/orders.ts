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
  payment_method: "stripe";
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
    mode?: "full" | "v1" | "v2";
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
        mode: item.mode ?? "full",
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
  payment_method: z.literal("stripe"),
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
    mode: z.enum(["full", "v1", "v2"]).optional().default("full"),
    quantity: z.number().int().positive(),
    selections: z.array(z.object({
      option_item_id: z.string(),
      quantity: z.number().int().positive().default(1),
    })).default([]),
  })).min(1),
});

const OrderQuoteSchema = z.object({
  type: z.enum(["delivery", "pickup"]),
  payment_method: z.literal("stripe").optional(),
  customer_phone: z.string().min(7).optional(),
  address_line: z.string().optional(),
  promo_code: z.string().optional(),
  delivery_zone_id: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string(),
    product_variant_id: z.string().optional(),
    mode: z.enum(["full", "v1", "v2"]).optional().default("full"),
    quantity: z.number().int().positive(),
    selections: z.array(z.object({
      option_item_id: z.string(),
      quantity: z.number().int().positive().default(1),
    })).default([]),
  })).min(1),
});

const StripeCancelSchema = z.object({
  tracking_token: z.string().min(1),
});

function buildLineItemDisplayName(input: {
  productName: string;
  variantName?: string;
  pieces?: number | null;
}) {
  if (input.variantName) {
    return `${input.productName} (${input.variantName})`;
  }

  if (input.pieces) {
    return `${input.productName} (${input.pieces} шт)`;
  }

  return input.productName;
}

type CalculatorItem = z.infer<typeof OrderSchema>["items"][number];

async function calculateOrderDraft(input: {
  type: "delivery" | "pickup";
  customer_phone?: string;
  promo_code?: string;
  delivery_zone_id?: string;
  items: CalculatorItem[];
}) {
  let subtotal = 0;
  const resolvedItems: Array<{
    product_id: string;
    product_variant_id?: string;
    mode?: "full" | "v1" | "v2";
    product_name_snapshot: string;
    variant_name_snapshot?: string;
    stripe_line_name: string;
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

  for (const item of input.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.product_id },
      select: {
        id: true,
        name_ru: true,
        is_active: true,
        is_available: true,
        base_price: true,
        pieces_total: true,
        variant1_pieces: true,
        variant1_price: true,
        variant2_pieces: true,
        variant2_price: true,
        variants: true,
        option_links: { include: { option_group: { include: { items: true } } } },
      },
    });

    if (!product || !product.is_active) {
      return { ok: false as const, status: 422, message: `Товар не найден: ${item.product_id}` };
    }
    if (!product.is_available) {
      return { ok: false as const, status: 422, message: `Товар недоступен: ${product.name_ru}` };
    }

    let unitPrice = parseFloat(product.base_price.toString());
    let variantName: string | undefined;
    const mode = item.mode ?? "full";

    if (!item.product_variant_id && mode === "v1") {
      if (!product.variant1_price) {
        return { ok: false as const, status: 422, message: `Вариант v1 недоступен для товара: ${product.name_ru}` };
      }
      unitPrice = parseFloat(product.variant1_price.toString());
      variantName = product.variant1_pieces ? `${product.variant1_pieces} шт` : "v1";
    }

    if (!item.product_variant_id && mode === "v2") {
      if (!product.variant2_price) {
        return { ok: false as const, status: 422, message: `Вариант v2 недоступен для товара: ${product.name_ru}` };
      }
      unitPrice = parseFloat(product.variant2_price.toString());
      variantName = product.variant2_pieces ? `${product.variant2_pieces} шт` : "v2";
    }

    if (item.product_variant_id) {
      const variant = product.variants.find((v) => v.id === item.product_variant_id);
      if (!variant) return { ok: false as const, status: 422, message: "Вариант не найден" };
      unitPrice = parseFloat(variant.price.toString());
      variantName = variant.name_ru;
    }

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
      if (!optionItem) return { ok: false as const, status: 422, message: `Опция не найдена: ${sel.option_item_id}` };
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
      mode,
      product_name_snapshot: product.name_ru,
      variant_name_snapshot: variantName,
      stripe_line_name: buildLineItemDisplayName({
        productName: product.name_ru,
        variantName,
        pieces:
          mode === "v1"
            ? product.variant1_pieces
            : mode === "v2"
              ? product.variant2_pieces
              : product.pieces_total,
      }),
      unit_price: unitPrice,
      quantity: item.quantity,
      line_total: lineTotal,
      selections: resolvedSelections,
    });
  }

  let deliveryFee = 0;
  let zoneId: string | undefined;
  if (input.type === "delivery" && input.delivery_zone_id) {
    const zone = await prisma.deliveryZone.findUnique({ where: { id: input.delivery_zone_id } });
    if (!zone || !zone.is_active) return { ok: false as const, status: 422, message: "Зона доставки не найдена" };

    if (subtotal < parseFloat(zone.min_order_amount.toString())) {
      return { ok: false as const, status: 422, message: `Минимальная сумма заказа: ${zone.min_order_amount} EUR` };
    }

    deliveryFee = parseFloat(zone.delivery_fee.toString());
    if (zone.free_delivery_from && subtotal >= parseFloat(zone.free_delivery_from.toString())) {
      deliveryFee = 0;
    }
    zoneId = zone.id;
  }

  let discountAmount = 0;
  let promoCodeId: string | undefined;
  let promoCodeValue: string | undefined;
  if (input.promo_code) {
    const promo = await prisma.promoCode.findFirst({
      where: {
        code: input.promo_code.toUpperCase(),
        is_active: true,
        OR: [{ valid_from: null }, { valid_from: { lte: new Date() } }],
        AND: [{ OR: [{ valid_to: null }, { valid_to: { gte: new Date() } }] }],
      },
    });

    if (!promo) return { ok: false as const, status: 422, message: "Промокод неверный или истёк" };

    if (promo.usage_limit_total) {
      const totalUsage = await prisma.promoCodeUsage.count({ where: { promo_code_id: promo.id } });
      if (totalUsage >= promo.usage_limit_total) {
        return { ok: false as const, status: 422, message: "Промокод больше не может использоваться" };
      }
    }

    if (input.customer_phone && promo.usage_limit_per_phone) {
      const phoneUsage = await prisma.promoCodeUsage.count({
        where: {
          promo_code_id: promo.id,
          phone: input.customer_phone,
        },
      });
      if (phoneUsage >= promo.usage_limit_per_phone) {
        return { ok: false as const, status: 422, message: "Вы уже использовали этот промокод максимальное количество раз" };
      }
    }

    if (promo.min_order_amount && subtotal < parseFloat(promo.min_order_amount.toString())) {
      return { ok: false as const, status: 422, message: `Минимальная сумма для промокода: ${promo.min_order_amount} EUR` };
    }

    discountAmount = promo.discount_type === "percent"
      ? (subtotal * parseFloat(promo.discount_value.toString())) / 100
      : parseFloat(promo.discount_value.toString());
    if (promo.max_discount_amount) {
      discountAmount = Math.min(discountAmount, parseFloat(promo.max_discount_amount.toString()));
    }

    promoCodeId = promo.id;
    promoCodeValue = promo.code;
  }

  const totalAmount = Math.max(0, subtotal + deliveryFee - discountAmount);

  return {
    ok: true as const,
    subtotal,
    deliveryFee,
    discountAmount,
    totalAmount,
    zoneId,
    promoCodeId,
    promoCodeValue,
    resolvedItems,
  };
}

export default async function publicOrdersRoutes(app: FastifyInstance) {
  // POST /api/orders/quote
  // Returns authoritative server-side pricing/validation for checkout UI.
  app.post("/orders/quote", async (req, reply) => {
    const parsed = OrderQuoteSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message, 422);

    const quote = parsed.data;
    if (quote.type === "delivery" && !quote.address_line) {
      return err(reply, "Адрес доставки обязателен", 422);
    }

    const calc = await calculateOrderDraft({
      type: quote.type,
      customer_phone: quote.customer_phone,
      promo_code: quote.promo_code,
      delivery_zone_id: quote.delivery_zone_id,
      items: quote.items,
    });

    if (!calc.ok) return err(reply, calc.message, calc.status);

    if (quote.payment_method === "stripe" && calc.totalAmount <= 0) {
      return err(reply, "Онлайн-оплата недоступна для заказа с нулевой суммой", 422);
    }

    return ok(reply, {
      items: calc.resolvedItems.map((item) => ({
        product_id: item.product_id,
        product_variant_id: item.product_variant_id,
        mode: item.mode ?? "full",
        name: item.stripe_line_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
      })),
      subtotal: calc.subtotal,
      delivery_fee: calc.deliveryFee,
      discount_amount: calc.discountAmount,
      total_amount: calc.totalAmount,
      promo_code: calc.promoCodeValue,
    });
  });

  // POST /api/orders
  app.post("/orders", async (req, reply) => {
    const parsed = OrderSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message);

    const body = parsed.data;

    const kitchenSettings = await prisma.restaurantSettings.findFirst({
      select: { kitchen_is_open: true },
    });
    if (!kitchenSettings?.kitchen_is_open) {
      return err(reply, "Кухня сейчас закрыта. Заказы не принимаются.", 503);
    }

    if (body.type === "delivery" && !body.address_line) {
      return err(reply, "Адрес доставки обязателен", 422);
    }

    const calc = await calculateOrderDraft({
      type: body.type,
      customer_phone: body.customer_phone,
      promo_code: body.promo_code,
      delivery_zone_id: body.delivery_zone_id,
      items: body.items,
    });
    if (!calc.ok) return err(reply, calc.message, calc.status);

    const subtotal = calc.subtotal;
    const deliveryFee = calc.deliveryFee;
    const discountAmount = calc.discountAmount;
    const totalAmount = calc.totalAmount;
    const zoneId = calc.zoneId;
    const promoCodeId = calc.promoCodeId;
    const resolvedItems = calc.resolvedItems;

    // Stripe Checkout does not support zero-amount payment sessions.
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

    // Detect duplicate Stripe checkout attempts within 30 minutes.
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

    // Prevent accidental duplicate Stripe orders from retries within 30 minutes.
    const existingOrder = await prisma.order.findFirst({
      where: {
        payment_method: body.payment_method,
        payment_status: "pending",
        status: { notIn: ["cancelled", "payment_failed", "expired"] },
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
          data: {
            status: "expired",
            payment_status: "failed",
            cancel_reason: "Сессия интернет-платежа истекла",
            cancelled_at: new Date(),
          },
        });
      }
    }

    const orderNumber = `YS-${Date.now().toString(36).toUpperCase()}`;
    const trackingToken = uuidv4();

    const order = await prisma.order.create({
      data: {
        order_number: orderNumber,
        tracking_token: trackingToken,
        type: body.type as "delivery" | "pickup",
        status: "awaiting_payment",
        payment_method: "stripe",
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

    // ─── Stripe Checkout ────────────────────────────────────────
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
          product_data: { name: item.stripe_line_name },
        },
        quantity: item.quantity,
      }));

    req.log.info(
      {
        orderId: order.id,
        cartItems: body.items.map((i) => ({
          product_id: i.product_id,
          product_variant_id: i.product_variant_id ?? null,
          mode: i.mode ?? "full",
          quantity: i.quantity,
        })),
        resolvedItems: resolvedItems.map((i) => ({
          product_id: i.product_id,
          product_variant_id: i.product_variant_id ?? null,
          mode: i.mode ?? "full",
          line_name: i.stripe_line_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          line_total: i.line_total,
        })),
        stripeLineItems: stripeLineItems.map((i) => ({
          name: i.price_data && "product_data" in i.price_data ? i.price_data.product_data?.name : null,
          unit_amount: i.price_data && "unit_amount" in i.price_data ? i.price_data.unit_amount : null,
          quantity: i.quantity,
        })),
      },
      "Stripe checkout calculation debug"
    );

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
      payment_intent_data: {
        metadata: { orderId: order.id },
      },
      // success_url/cancel_url are only UI redirects; payment truth is the webhook.
      success_url: `${baseUrl}/track/${order.tracking_token}`,
      cancel_url: `${baseUrl}/checkout?cancelled=1&tracking_token=${order.tracking_token}`,
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
          status: "payment_failed",
          payment_status: "failed",
          cancel_reason: "Не удалось инициализировать интернет-платеж",
          cancelled_at: new Date(),
        },
      });

      return err(reply, "Не удалось создать интернет-платеж. Попробуйте снова позже.", 502);
    }
  });

  // POST /api/orders/stripe/cancel
  // Called when user returns from cancel_url. Server validates Stripe session state
  // and expires an open session to keep DB status in sync with the real checkout state.
  app.post("/orders/stripe/cancel", async (req, reply) => {
    const parsed = StripeCancelSchema.safeParse(req.body);
    if (!parsed.success) return err(reply, parsed.error.message, 422);

    const order = await prisma.order.findFirst({
      where: {
        tracking_token: parsed.data.tracking_token,
        payment_method: "stripe",
      },
      orderBy: { created_at: "desc" },
    });

    if (!order) return err(reply, "Stripe-заказ не найден", 404);

    if (order.payment_status === "paid") {
      return ok(reply, { status: order.status, payment_status: order.payment_status });
    }

    if (["cancelled", "expired", "payment_failed"].includes(order.status)) {
      return ok(reply, { status: order.status, payment_status: order.payment_status });
    }

    if (!order.stripe_session_id) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "payment_failed",
          payment_status: "failed",
          cancel_reason: "Stripe session не найдена",
          cancelled_at: new Date(),
        },
      });
      return ok(reply, { status: "payment_failed", payment_status: "failed" });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);

    if (session.status === "complete" && session.payment_status === "paid") {
      return ok(reply, { status: order.status, payment_status: "paid" });
    }

    if (session.status === "expired") {
      await prisma.order.updateMany({
        where: { id: order.id, payment_status: "pending" },
        data: {
          status: "expired",
          payment_status: "failed",
          cancel_reason: "Сессия интернет-платежа истекла",
          cancelled_at: new Date(),
        },
      });
      return ok(reply, { status: "expired", payment_status: "failed" });
    }

    if (session.status === "open" && session.payment_status === "unpaid") {
      await stripe.checkout.sessions.expire(session.id);

      await prisma.order.updateMany({
        where: { id: order.id, payment_status: "pending" },
        data: {
          status: "cancelled",
          payment_status: "failed",
          cancel_reason: "Пользователь отменил интернет-платеж",
          cancelled_at: new Date(),
        },
      });

      return ok(reply, { status: "cancelled", payment_status: "failed" });
    }

    return ok(reply, { status: order.status, payment_status: order.payment_status });
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

  // POST /api/orders/track/:token/confirm-received
  // Customer confirms they received the delivery (only when status = "sent")
  app.post<{ Params: { token: string } }>("/orders/track/:token/confirm-received", async (req, reply) => {
    const order = await prisma.order.findFirst({
      where: { tracking_token: req.params.token },
    });

    if (!order) return err(reply, "Заказ не найден", 404);
    if (order.status !== "sent") return err(reply, "Заказ пока не передан курьеру", 422);

    const [updated, settings] = await Promise.all([
      prisma.order.update({
        where: { id: order.id },
        data: { status: "completed", completed_at: new Date() },
        include: { items: { include: { selections: true } } },
      }),
      prisma.restaurantSettings.findFirst({
        select: { min_delivery_time_minutes: true, max_delivery_time_minutes: true },
      }),
    ]);

    return ok(reply, {
      ...updated,
      estimated_min_minutes: settings?.min_delivery_time_minutes ?? 30,
      estimated_max_minutes: settings?.max_delivery_time_minutes ?? 60,
    });
  });
}
