-- AlterTable
ALTER TABLE "products" ADD COLUMN     "has_pending_edit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pending_changes" TEXT,
ADD COLUMN     "pending_rejection_reason" TEXT;

