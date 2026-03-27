ALTER TABLE "RestaurantSettings"
ADD COLUMN "kitchen_default_prep_minutes" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN "kitchen_is_open" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "kitchen_day_started_at" TIMESTAMP(3),
ADD COLUMN "kitchen_day_ended_at" TIMESTAMP(3);

ALTER TABLE "Order"
ADD COLUMN "estimated_prep_minutes" INTEGER,
ADD COLUMN "estimated_ready_at" TIMESTAMP(3);
