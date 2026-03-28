import { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { prisma } from "../../lib/prisma";

// Stripe instance is created lazily so missing env var only blows up at runtime,
// not at module load (avoids crashing dev server when key is not yet configured).
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

function extractPaymentIntentId(
  value: Stripe.Checkout.Session["payment_intent"] | Stripe.PaymentIntent | null | undefined
): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return undefined;
}

async function resolveOrderBySession(session: Stripe.Checkout.Session) {
  const metadataOrderId = session.metadata?.orderId;
  const paymentIntentId = extractPaymentIntentId(session.payment_intent);

  if (metadataOrderId) {
    const byOrderId = await prisma.order.findUnique({ where: { id: metadataOrderId } });
    if (byOrderId) return byOrderId;
  }

  const bySessionId = await prisma.order.findFirst({
    where: { stripe_session_id: session.id },
  });
  if (bySessionId) return bySessionId;

  if (paymentIntentId) {
    const byPaymentIntent = await prisma.order.findFirst({
      where: { stripe_payment_intent_id: paymentIntentId },
    });
    if (byPaymentIntent) return byPaymentIntent;
  }

  return null;
}

async function markOrderPaidFromCheckoutSession(session: Stripe.Checkout.Session) {
  const order = await resolveOrderBySession(session);
  if (!order) return { handled: false, reason: "order_not_found" };

  if (order.payment_method !== "stripe") return { handled: false, reason: "not_stripe_order", orderId: order.id };
  if (session.payment_status !== "paid") return { handled: false, reason: "session_not_paid", orderId: order.id };

  const paymentIntentId = extractPaymentIntentId(session.payment_intent);
  const existingPromoUsage = await prisma.promoCodeUsage.findFirst({ where: { order_id: order.id } });

  await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: {
        id: order.id,
        payment_status: { not: "paid" },
      },
      data: {
        status: "new",
        payment_status: "paid",
        cancel_reason: null,
        cancelled_at: null,
        ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
      },
    });

    if (updated.count === 0) return;

    if (order.promo_code_id && order.discount_amount.gt(0) && !existingPromoUsage) {
      await tx.promoCodeUsage.create({
        data: {
          promo_code_id: order.promo_code_id,
          order_id: order.id,
          phone: order.customer_phone,
          discount_amount: order.discount_amount,
        },
      });
    }
  });

  return { handled: true, orderId: order.id };
}

async function markOrderFailedFromCheckoutSession(
  session: Stripe.Checkout.Session,
  nextStatus: "expired" | "payment_failed" | "cancelled",
  reason: string
) {
  const order = await resolveOrderBySession(session);
  if (!order) return { handled: false, reason: "order_not_found" };

  if (order.payment_method !== "stripe") return { handled: false, reason: "not_stripe_order", orderId: order.id };
  if (order.payment_status === "paid") return { handled: false, reason: "already_paid", orderId: order.id };

  const paymentIntentId = extractPaymentIntentId(session.payment_intent);

  await prisma.order.updateMany({
    where: {
      id: order.id,
      payment_status: "pending",
    },
    data: {
      status: nextStatus,
      payment_status: "failed",
      cancel_reason: reason,
      cancelled_at: new Date(),
      ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
    },
  });

  return { handled: true, orderId: order.id };
}

async function markOrderFailedFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  reason: string
) {
  const metadataOrderId = paymentIntent.metadata?.orderId;

  let order = null;
  if (metadataOrderId) {
    order = await prisma.order.findUnique({ where: { id: metadataOrderId } });
  }

  if (!order) {
    order = await prisma.order.findFirst({ where: { stripe_payment_intent_id: paymentIntent.id } });
  }

  if (!order) return { handled: false, reason: "order_not_found" };
  if (order.payment_method !== "stripe") return { handled: false, reason: "not_stripe_order", orderId: order.id };
  if (order.payment_status === "paid") return { handled: false, reason: "already_paid", orderId: order.id };

  await prisma.order.updateMany({
    where: {
      id: order.id,
      payment_status: "pending",
    },
    data: {
      status: "payment_failed",
      payment_status: "failed",
      cancel_reason: reason,
      cancelled_at: new Date(),
      stripe_payment_intent_id: paymentIntent.id,
    },
  });

  return { handled: true, orderId: order.id };
}

export default async function stripeWebhookRoutes(app: FastifyInstance) {
  // POST /api/stripe/webhook
  // Called by Stripe — NOT by the browser.
  // ⚠️  Must use rawBody for signature verification; do NOT parse JSON here.
  app.post("/stripe/webhook", async (req, reply) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      req.log.error("Stripe webhook: missing signature or secret");
      return reply.code(400).send({ error: "Bad request" });
    }

    // rawBody is attached by the custom content-type parser in app.ts
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody) {
      req.log.error("Stripe webhook: rawBody is missing — check content-type parser setup");
      return reply.code(400).send({ error: "No raw body" });
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      req.log.warn(`Stripe webhook signature verification failed: ${err.message}`);
      return reply.code(400).send({ error: `Webhook error: ${err.message}` });
    }

    // ─── Handle events ───────────────────────────────────────────
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await markOrderPaidFromCheckoutSession(session);
        if (!result.handled) {
          req.log.warn(
            `Stripe webhook: checkout.session.completed ignored (${result.reason}) session=${session.id}`
          );
          break;
        }

        req.log.info(`Stripe webhook: order ${result.orderId} -> paid/new via session ${session.id}`);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await markOrderFailedFromCheckoutSession(
          session,
          "expired",
          "Сессия интернет-платежа истекла"
        );
        if (!result.handled) {
          req.log.warn(`Stripe webhook: checkout.session.expired ignored (${result.reason}) session=${session.id}`);
          break;
        }
        req.log.info(`Stripe webhook: order ${result.orderId} -> expired/failed via session ${session.id}`);
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await markOrderFailedFromCheckoutSession(
          session,
          "payment_failed",
          "Интернет-платеж отклонен платежной системой"
        );
        if (!result.handled) {
          req.log.warn(
            `Stripe webhook: checkout.session.async_payment_failed ignored (${result.reason}) session=${session.id}`
          );
          break;
        }
        req.log.info(`Stripe webhook: order ${result.orderId} -> payment_failed via session ${session.id}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const result = await markOrderFailedFromPaymentIntent(
          paymentIntent,
          "Интернет-платеж отклонен платежной системой"
        );
        if (!result.handled) {
          req.log.warn(
            `Stripe webhook: payment_intent.payment_failed ignored (${result.reason}) paymentIntent=${paymentIntent.id}`
          );
          break;
        }
        req.log.info(
          `Stripe webhook: order ${result.orderId} -> payment_failed via paymentIntent ${paymentIntent.id}`
        );
        break;
      }

      default:
        // Ignore all other events; return 200 so Stripe stops retrying.
        break;
    }

    return reply.code(200).send({ received: true });
  });
}
