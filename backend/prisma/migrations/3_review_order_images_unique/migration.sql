-- Deduplicate any pre-existing multiple reviews per (user, store) before the
-- unique constraint below, keeping only the most recent one. Rows where
-- store_id is NULL (product-only reviews) are untouched.
DELETE FROM "reviews" r
USING "reviews" r2
WHERE r.store_id IS NOT NULL
  AND r.store_id = r2.store_id
  AND r.user_id = r2.user_id
  AND r.created_at < r2.created_at;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "images" TEXT,
ADD COLUMN     "order_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_store_id_key" ON "reviews"("user_id", "store_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
