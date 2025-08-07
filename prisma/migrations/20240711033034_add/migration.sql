/*
  Warnings:

  - Added the required column `invoice` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoice` to the `Sale` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "invoice" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "invoice" TEXT NOT NULL;
