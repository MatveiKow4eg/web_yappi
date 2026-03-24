import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { NextRequest } from "next/server";
import { generateOrderNumber, generateStatusToken } from "@/lib/utils";
import { z } from "zod";

const OrderSchema = z.object({
  type: z.enum(["delivery", "pickup"]),
  payment_method: z.enum([
    "stripe",
    "cash_on_pickup",
    "card_on_pickup",
    "cash_on_delivery",
    "card_on_delivery",
  ]),
  customer_name: z.string().min(2),
  customer_phone: z.string().min(7),
  address_line: z.string().optional(),
  apartment: z.string().optional(),
  entrance: z.string().optional(),
  floor: z.string().optional(),
  door_code: z.string().optional(),
  comment: z.string().optional(),
  promo_code: z.string().optional(),
  language_code: z.string().default("ru"),
  items: z
    .array(
      z.object({
        product_id: z.string(),
        product_variant_id: z.string().optional(),
        quantity: z.number().int().positive(),
        selections: z
          .array(
            z.object({
              option_item_id: z.string(),
              quantity: z.number().int().positive().default(1),
            })
          )
          .optional(),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return apiError("Invalid JSON");

  const parsed = OrderSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const data = parsed.data;

  // Validate and calculate prices
  let subtotal = 0;
  const resolvedItems = [];

  for (const item of data.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.product_id },
      include: { variants: true },
    });
    if (!product || !product.is_active || !product.is_available) {
      return apiError(`Product ${item.product_id} not available`);
    }

    let unit_price = parseFloat(product.base_price.toString());
    let variant = null;

    if (item.product_variant_id) {
      variant = product.variants.find((v) => v.id === item.product_variant_id);
      if (variant) unit_price = parseFloat(variant.price.toString());
    }

    const selections = [];
    if (item.selections) {
      for (const sel of item.selections) {
        const optItem = await prisma.productOptionItem.findUnique({
          where: { id: sel.option_item_id },
          include: { group: true },
        });
        if (optItem) {
          const delta = parseFloat(optItem.price_delta.toString()) * sel.quantity;
          unit_price += delta;
          selections.push({
            option_group_name_snapshot: optItem.group.name_ru,
            option_item_name_snapshot: optItem.name_ru,
            price_delta: optItem.price_delta,
            quantity: sel.quantity,
          });
        }
      }
    }

    const line_total = unit_price * item.quantity;
    subtotal += line_total;

    resolvedItems.push({
      product_id: item.product_id,
      product_variant_id: item.product_variant_id,
      product_name_snapshot: product.name_ru,
      variant_name_snapshot: variant?.name_ru ?? null,
      unit_price,
      quantity: item.quantity,
      line_total,
      selections,
    });
  }

  // Promo code
  let discount_amount = 0;
  let promo_code_id: string | null = null;

  if (data.promo_code) {
    const promo = await prisma.promoCode.findFirst({
      where: {
        code: data.promo_code.toUpperCase(),
        is_active: true,
        OR: [{ valid_from: null }, { valid_from: { lte: new Date() } }],
        AND: [{ OR: [{ valid_to: null }, { valid_to: { gte: new Date() } }] }],
      },
    });

    if (promo) {
      if (promo.min_order_amount && subtotal < parseFloat(promo.min_order_amount.toString())) {
        return apiError(
          `Минимальная сумма заказа для этого промокода: ${promo.min_order_amount} €`
        );
      }
      if (promo.discount_type === "percent") {
        discount_amount = (subtotal * parseFloat(promo.discount_value.toString())) / 100;
      } else {
        discount_amount = parseFloat(promo.discount_value.toString());
      }
      if (promo.max_discount_amount) {
        discount_amount = Math.min(discount_amount, parseFloat(promo.max_discount_amount.toString()));
      }
      promo_code_id = promo.id;
    }
  }

  const delivery_fee = 0; // TODO: calculate from delivery zone
  const total_amount = subtotal - discount_amount + delivery_fee;

  // Upsert customer
  let customerId: string | null = null;
  if (data.customer_phone) {
    const customer = await prisma.customer.upsert({
      where: { phone: data.customer_phone },
      update: { name: data.customer_name, last_order_at: new Date() },
      create: { phone: data.customer_phone, name: data.customer_name, last_order_at: new Date() },
    });
    customerId = customer.id;
  }

  // Create order
  const order = await prisma.order.create({
    data: {
      order_number: generateOrderNumber(),
      public_status_token: generateStatusToken(),
      type: data.type,
      status: "new",
      payment_method: data.payment_method,
      payment_status: data.payment_method === "stripe" ? "pending" : "unpaid",
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_id: customerId,
      address_line: data.address_line,
      apartment: data.apartment,
      entrance: data.entrance,
      floor: data.floor,
      door_code: data.door_code,
      comment: data.comment,
      subtotal_amount: subtotal,
      delivery_fee,
      discount_amount,
      total_amount,
      promo_code_id,
      language_code: data.language_code,
      items: {
        create: resolvedItems.map((i) => ({
          product_id: i.product_id,
          product_variant_id: i.product_variant_id,
          product_name_snapshot: i.product_name_snapshot,
          variant_name_snapshot: i.variant_name_snapshot,
          unit_price: i.unit_price,
          quantity: i.quantity,
          line_total: i.line_total,
          selections: { create: i.selections },
        })),
      },
      ...(promo_code_id
        ? {
            promo_usages: {
              create: {
                promo_code_id,
                phone: data.customer_phone,
                discount_amount,
              },
            },
          }
        : {}),
    },
  });

  return apiSuccess(
    {
      order_number: order.order_number,
      tracking_token: order.public_status_token,
      total_amount: order.total_amount,
      payment_method: order.payment_method,
    },
    201
  );
}
