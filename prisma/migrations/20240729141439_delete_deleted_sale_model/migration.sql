/*
  Warnings:

  - You are about to drop the column `deletionReason` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the `DeletedSale` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DeletedSale" DROP CONSTRAINT "DeletedSale_deletedBy_fkey";

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "deletionReason";

-- DropTable
DROP TABLE "DeletedSale";
