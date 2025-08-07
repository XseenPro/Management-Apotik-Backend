/*
  Warnings:

  - You are about to drop the column `categories` on the `Drug` table. All the data in the column will be lost.
  - Added the required column `category` to the `Drug` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Drug" DROP CONSTRAINT "Drug_categories_fkey";

-- AlterTable
ALTER TABLE "Drug" DROP COLUMN "categories",
ADD COLUMN     "category" TEXT NOT NULL,
ALTER COLUMN "sellingPrice" DROP NOT NULL,
ALTER COLUMN "expiredDate" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Drug" ADD CONSTRAINT "Drug_category_fkey" FOREIGN KEY ("category") REFERENCES "Category"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
