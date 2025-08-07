/*
  Warnings:

  - A unique constraint covering the columns `[invoice]` on the table `Purchase` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoice]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Purchase_invoice_key" ON "Purchase"("invoice");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_invoice_key" ON "Sale"("invoice");
