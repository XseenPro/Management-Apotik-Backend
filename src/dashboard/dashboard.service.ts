import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getDashboardStatistics = async () => {
  const totalDrugs = await prisma.drug.count()
  const totalSupplier = await prisma.supplier.count()
  const totalSales = await prisma.sale.count()
  const totalPurchase = await prisma.purchase.count()

  return {
    totalDrugs,
    totalSupplier,
    totalSales,
    totalPurchase
  }
}
