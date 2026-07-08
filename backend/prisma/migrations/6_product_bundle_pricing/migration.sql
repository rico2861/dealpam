-- AlterTable
ALTER TABLE "products" ADD COLUMN     "min_order_qty" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "price_tiers" TEXT;

