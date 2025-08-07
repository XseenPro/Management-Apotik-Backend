/*
  Warnings:

  - You are about to drop the `_CategoryToDrug` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categories` to the `Drug` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_CategoryToDrug" DROP CONSTRAINT "_CategoryToDrug_A_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToDrug" DROP CONSTRAINT "_CategoryToDrug_B_fkey";

-- AlterTable
ALTER TABLE "Drug" ADD COLUMN     "categories" TEXT NOT NULL;

-- DropTable
DROP TABLE "_CategoryToDrug";

-- AddForeignKey
ALTER TABLE "Drug" ADD CONSTRAINT "Drug_categories_fkey" FOREIGN KEY ("categories") REFERENCES "Category"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
