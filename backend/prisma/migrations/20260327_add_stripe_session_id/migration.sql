-- AlterTable: add stripe_session_id to Order for linking Stripe Checkout Sessions
ALTER TABLE "Order" ADD COLUMN "stripe_session_id" TEXT;
