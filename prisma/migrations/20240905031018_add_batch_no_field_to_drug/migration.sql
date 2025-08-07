/*
  Warnings:

  - Added the required column `batchNo` to the `Drug` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Drug" ADD COLUMN     "batchNo" TEXT NOT NULL;
