-- Add payment lifecycle statuses and Stripe payment intent linkage for webhook reconciliation.

DO $$
BEGIN
  ALTER TYPE "public"."OrderStatus" ADD VALUE IF NOT EXISTS 'awaiting_payment';
  ALTER TYPE "public"."OrderStatus" ADD VALUE IF NOT EXISTS 'payment_failed';
  ALTER TYPE "public"."OrderStatus" ADD VALUE IF NOT EXISTS 'expired';
END $$;

ALTER TABLE "public"."Order"
  ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_stripe_payment_intent_id_key"
  ON "public"."Order"("stripe_payment_intent_id");
