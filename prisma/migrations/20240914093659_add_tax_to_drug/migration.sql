/*
  Warnings:

  - You are about to drop the column `purchasePrice` on the `Drug` table. All the data in the column will be lost.
  - Added the required column `purchasePriceAfterTax` to the `Drug` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchasePriceBeforeTax` to the `Drug` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Drug" DROP COLUMN "purchasePrice",
ADD COLUMN     "purchasePriceAfterTax" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "purchasePriceBeforeTax" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "tax" DOUBLE PRECISION NOT NULL DEFAULT 0;
