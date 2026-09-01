-- CreateTable
CREATE TABLE "cross_app_payments" (
    "id" TEXT NOT NULL,
    "app_tag" TEXT NOT NULL,
    "moncash_transaction_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "response_payload" TEXT,
    "redirect_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cross_app_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cross_app_payments_app_tag_moncash_transaction_id_key" ON "cross_app_payments"("app_tag", "moncash_transaction_id");
