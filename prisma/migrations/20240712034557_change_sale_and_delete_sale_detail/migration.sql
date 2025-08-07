/*
  Warnings:

  - You are about to drop the column `totalAmount` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the `SaleDetail` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `saleItems` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPrice` to the `Sale` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SaleDetail" DROP CONSTRAINT "SaleDetail_drugName_fkey";

-- DropForeignKey
ALTER TABLE "SaleDetail" DROP CONSTRAINT "SaleDetail_saleId_fkey";

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "totalAmount",
ADD COLUMN     "saleItems" JSONB NOT NULL,
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL;

-- DropTable
DROP TABLE "SaleDetail";
