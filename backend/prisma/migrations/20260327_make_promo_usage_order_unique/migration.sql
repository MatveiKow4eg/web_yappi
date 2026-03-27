-- Ensure a promo code usage can be linked to a given order only once
ALTER TABLE "PromoCodeUsage"
ADD CONSTRAINT "PromoCodeUsage_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "PromoCodeUsage_order_id_key" ON "PromoCodeUsage"("order_id");
