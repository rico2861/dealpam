-- CreateEnum
CREATE TYPE "MoncashTxStatus" AS ENUM ('SUCCESS', 'FAILED', 'ALREADY_CREDITED', 'PENDING', 'UNKNOWN');

-- CreateTable
CREATE TABLE "moncash_transactions" (
    "id" TEXT NOT NULL,
    "order_id" TEXT,
    "moncash_transaction_id" TEXT,
    "reference" TEXT,
    "amount" DECIMAL(10,2),
    "payer" TEXT,
    "status" "MoncashTxStatus" NOT NULL DEFAULT 'PENDING',
    "fail_reason" TEXT,
    "credited" BOOLEAN NOT NULL DEFAULT false,
    "scenario" TEXT NOT NULL,
    "raw_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moncash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "moncash_transactions_moncash_transaction_id_key" ON "moncash_transactions"("moncash_transaction_id");

-- CreateIndex
CREATE INDEX "moncash_transactions_order_id_idx" ON "moncash_transactions"("order_id");

-- CreateIndex
CREATE INDEX "moncash_transactions_status_idx" ON "moncash_transactions"("status");

-- CreateIndex
CREATE INDEX "moncash_transactions_scenario_idx" ON "moncash_transactions"("scenario");

