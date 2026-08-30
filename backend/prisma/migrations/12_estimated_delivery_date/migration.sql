-- Date estimee de reception, renseignee par le vendeur a l'expedition (SHIPPED).
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "estimated_delivery_date" TIMESTAMP(3);
