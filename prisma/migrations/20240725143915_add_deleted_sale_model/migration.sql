/*
  Warnings:

  - You are about to drop the column `deletionReason` on the `Sale` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "deletionReason";

-- CreateTable
CREATE TABLE "DeletedSale" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "invoice" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "username" TEXT NOT NULL,
    "saleItems" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "DeletedSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeletedSale_saleId_idx" ON "DeletedSale"("saleId");

-- AddForeignKey
ALTER TABLE "DeletedSale" ADD CONSTRAINT "DeletedSale_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("username") ON DELETE RESTRICT ON UPDATE CASCADE;
