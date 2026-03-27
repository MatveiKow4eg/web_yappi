-- Add a fingerprint to detect duplicate Stripe checkout attempts for the same order payload
ALTER TABLE "Order" ADD COLUMN "checkout_fingerprint" TEXT;

CREATE INDEX "Order_checkout_fingerprint_created_at_idx"
ON "Order"("checkout_fingerprint", "created_at");
