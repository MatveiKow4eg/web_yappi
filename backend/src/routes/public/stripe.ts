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
        const orderId = session.metadata?.orderId;

        if (!orderId) {
          req.log.warn("Stripe webhook: checkout.session.completed with no orderId in metadata");
          break;
        }

        const order = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          req.log.warn(`Stripe webhook: order ${orderId} not found`);
          break;
        }

        if (order.payment_method !== "stripe") {
          req.log.warn(`Stripe webhook: order ${orderId} is not a Stripe order`);
          break;
        }

        if (session.payment_status !== "paid") {
          req.log.warn(
            `Stripe webhook: checkout.session.completed for order ${orderId} but payment_status=${session.payment_status}`
          );
          break;
        }

        const orderWithStripeSession = order as typeof order & {
          stripe_session_id?: string | null;
        };

        if (!orderWithStripeSession.stripe_session_id) {
          req.log.warn(`Stripe webhook: order ${orderId} has no stored stripe_session_id`);
          break;
        }

        if (orderWithStripeSession.stripe_session_id !== session.id) {
          req.log.warn(
            `Stripe webhook: session mismatch for order ${orderId} (expected ${orderWithStripeSession.stripe_session_id}, got ${session.id})`
          );
          break;
        }

        const existingPromoUsage = await prisma.promoCodeUsage.findFirst({
          where: { order_id: orderId },
        });

        // Idempotent transaction: mark as paid once and attach promo usage once.
        await prisma.$transaction(async (tx) => {
          const updateResult = await tx.order.updateMany({
            where: {
              id: orderId,
              status: { not: "cancelled" },
              payment_status: { not: "paid" },
            },
            data: { payment_status: "paid" },
          });

          if (updateResult.count === 0) {
            return;
          }

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

        req.log.info(
          `Stripe webhook: order ${orderId} → payment_status=paid via session ${session.id}`
        );
        break;
      }

      case "checkout.session.expired": {
        // User opened Stripe Checkout but never paid and the session expired (default 24 h).
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          const order = await prisma.order.findUnique({ where: { id: orderId } });

          if (!order) {
            break;
          }

          const orderWithStripeSession = order as typeof order & {
            stripe_session_id?: string | null;
          };

          if (
            order.payment_method !== "stripe" ||
            !orderWithStripeSession.stripe_session_id ||
            orderWithStripeSession.stripe_session_id !== session.id
          ) {
            break;
          }

          await prisma.order.updateMany({
            where: { id: orderId, payment_status: "pending" },
            data: { payment_status: "failed" },
          });
          req.log.info(`Stripe webhook: order ${orderId} → payment_status=failed (session expired)`);
        }
        break;
      }

      default:
        // Ignore all other events; return 200 so Stripe stops retrying.
        break;
    }

    return reply.code(200).send({ received: true });
  });
}
