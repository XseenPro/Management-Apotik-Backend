/*
  Warnings:

  - You are about to drop the column `totalAmount` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the `PurchaseDetail` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `purchaseItems` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPrice` to the `Purchase` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PurchaseDetail" DROP CONSTRAINT "PurchaseDetail_drugName_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseDetail" DROP CONSTRAINT "PurchaseDetail_purchaseId_fkey";

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "totalAmount",
ADD COLUMN     "purchaseItems" JSONB NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL;

-- DropTable
DROP TABLE "PurchaseDetail";
