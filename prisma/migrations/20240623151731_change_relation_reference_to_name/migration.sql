/*
  Warnings:

  - You are about to drop the column `supplierId` on the `Drug` table. All the data in the column will be lost.
  - You are about to drop the column `supplierId` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `drugId` on the `PurchaseDetail` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `drugId` on the `SaleDetail` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `_DrugToUnit` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `supplierName` to the `Drug` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitName` to the `Drug` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplierName` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `drugName` to the `PurchaseDetail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `drugName` to the `SaleDetail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Drug" DROP CONSTRAINT "Drug_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_userId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseDetail" DROP CONSTRAINT "PurchaseDetail_drugId_fkey";

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_userId_fkey";

-- DropForeignKey
ALTER TABLE "SaleDetail" DROP CONSTRAINT "SaleDetail_drugId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- DropForeignKey
ALTER TABLE "_DrugToUnit" DROP CONSTRAINT "_DrugToUnit_A_fkey";

-- DropForeignKey
ALTER TABLE "_DrugToUnit" DROP CONSTRAINT "_DrugToUnit_B_fkey";

-- AlterTable
ALTER TABLE "Drug" DROP COLUMN "supplierId",
ADD COLUMN     "supplierName" TEXT NOT NULL,
ADD COLUMN     "unitName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "supplierId",
DROP COLUMN "userId",
ADD COLUMN     "supplierName" TEXT NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseDetail" DROP COLUMN "drugId",
ADD COLUMN     "drugName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "userId",
ADD COLUMN     "username" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SaleDetail" DROP COLUMN "drugId",
ADD COLUMN     "drugName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "roleId",
ADD COLUMN     "roleName" TEXT NOT NULL;

-- DropTable
DROP TABLE "_DrugToUnit";

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleName_fkey" FOREIGN KEY ("roleName") REFERENCES "Role"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drug" ADD CONSTRAINT "Drug_unitName_fkey" FOREIGN KEY ("unitName") REFERENCES "Unit"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drug" ADD CONSTRAINT "Drug_supplierName_fkey" FOREIGN KEY ("supplierName") REFERENCES "Supplier"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierName_fkey" FOREIGN KEY ("supplierName") REFERENCES "Supplier"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_username_fkey" FOREIGN KEY ("username") REFERENCES "User"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDetail" ADD CONSTRAINT "PurchaseDetail_drugName_fkey" FOREIGN KEY ("drugName") REFERENCES "Drug"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_username_fkey" FOREIGN KEY ("username") REFERENCES "User"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDetail" ADD CONSTRAINT "SaleDetail_drugName_fkey" FOREIGN KEY ("drugName") REFERENCES "Drug"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
