import { Prisma, PrismaClient, Store } from '@prisma/client'
import { getDrugByName } from '../drug/drug.service'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import {
  subDays,
  subWeeks,
  subMonths,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  isAfter
} from 'date-fns'
import PdfPrinter from 'pdfmake'
import { TDocumentDefinitions } from 'pdfmake/interfaces'
import path from 'path'
import { getStoreData } from '../store/store.service'

const prisma = new PrismaClient()

export interface SaleItemInput {
  drugName: string
  quantity: number
  discount?: number // Diskon per obat (opsional)
}

export interface CreateSaleInput {
  date: Date
  invoice: string
  username: string
  saleItems: SaleItemInput[]
}

interface RecentSalesParams {
  limit?: number
}

interface GetAllSalesParams {
  date?: string
}

const timeZone = 'Asia/Jakarta'

export const createSaleService = async (saleData: CreateSaleInput) => {
  const { date, invoice, username, saleItems } = saleData

  const jakartaTimeZone = 'Asia/Jakarta'
  const nowInJakarta = fromZonedTime(new Date(), jakartaTimeZone)
  const saleDateUtc = toZonedTime(date, jakartaTimeZone)

  if (isAfter(saleDateUtc, nowInJakarta)) {
    throw new Error('The sale date cannot be in the future.')
  }

  let totalPrice = 0

  // Perulangan untuk setiap item obat yang dijual
  for (const item of saleItems) {
    const drug = await prisma.drug.findUnique({
      where: { name: item.drugName },
      select: { sellingPrice: true, quantity: true }
    })

    if (!drug) {
      throw new Error(`Drug ${item.drugName} does not exist`)
    }

    if (drug.quantity < item.quantity) {
      throw new Error(`Insufficient quantity for drug ${item.drugName}`)
    }

    const itemPrice = drug.sellingPrice ? drug.sellingPrice * item.quantity : 0

    // Hitung diskon per obat jika ada
    const itemDiscount = item.discount ?? 0
    const discountedItemPrice = Math.max(itemPrice - itemDiscount, 0)

    totalPrice += discountedItemPrice
  }

  // Simpan data penjualan ke dalam database
  const newSale = await prisma.sale.create({
    data: {
      date,
      invoice,
      totalPrice,
      username,
      saleItems: saleItems as unknown as Prisma.JsonObject
    }
  })

  // Update jumlah obat yang tersedia
  for (const item of saleItems) {
    await prisma.drug.update({
      where: { name: item.drugName },
      data: {
        quantity: {
          decrement: item.quantity
        }
      }
    })
  }

  return newSale
}

export const getLastInvoice = async (date: Date) => {
  const today = toZonedTime(date, timeZone)

  const startOfDay = fromZonedTime(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0), timeZone)

  const endOfDay = fromZonedTime(
    new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999),
    timeZone
  )

  const lastInvoice = await prisma.sale.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    orderBy: {
      invoice: 'desc'
    },
    take: 1
  })

  const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
    today.getDate()
  ).padStart(2, '0')}`

  let nextInvoiceId = 1
  if (lastInvoice.length > 0) {
    const lastInvoiceId = parseInt(lastInvoice[0].invoice.split('-').pop() || '0', 10)
    nextInvoiceId = lastInvoiceId + 1
    const nextInvoice = `INV-S-${datePart}-${String(nextInvoiceId).padStart(2, '0')}`
    return {
      lastInvoice: lastInvoice[0].invoice,
      nextInvoice
    }
  }

  const nextInvoice = `INV-S-${datePart}-${String(nextInvoiceId).padStart(2, '0')}`
  return {
    lastInvoice: null,
    nextInvoice
  }
}

// export const getTotalIncomeAndSales = async () => {
//   const totalSales = await prisma.sale.count()

//   const totalIncomeResult = await prisma.sale.aggregate({
//     _sum: {
//       totalPrice: true
//     }
//   })

//   const totalIncome = totalIncomeResult._sum.totalPrice || 0

//   return {
//     totalSales,
//     totalIncome
//   }
// }

export const getTotalIncomeAndSales = async () => {
  // Calculate total sales
  const totalSales = await prisma.sale.count()

  // Calculate total income
  const totalIncomeResult = await prisma.sale.aggregate({
    _sum: {
      totalPrice: true
    }
  })

  const totalIncome = totalIncomeResult._sum.totalPrice || 0

  // Calculate total profit
  const salesWithItems = await prisma.sale.findMany({
    select: {
      saleItems: true
    }
  })

  let totalProfit = 0

  for (const sale of salesWithItems) {
    const saleItems = sale.saleItems as any[]
    for (const item of saleItems) {
      const drug = await prisma.drug.findUnique({
        where: { name: item.drugName },
        select: {
          purchasePriceAfterTax: true,
          sellingPrice: true
        }
      })

      if (drug) {
        const purchasePrice = drug.purchasePriceAfterTax || 0
        const sellingPrice = drug.sellingPrice || 0
        totalProfit += (sellingPrice - purchasePrice) * item.quantity
      }
    }
  }

  // Calculate profit for this month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const salesThisMonth = await prisma.sale.findMany({
    where: {
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    },
    select: {
      saleItems: true
    }
  })

  let thisMonthProfit = 0

  for (const sale of salesThisMonth) {
    const saleItems = sale.saleItems as any[]
    for (const item of saleItems) {
      const drug = await prisma.drug.findUnique({
        where: { name: item.drugName },
        select: {
          purchasePriceAfterTax: true,
          sellingPrice: true
        }
      })

      if (drug) {
        const purchasePrice = drug.purchasePriceAfterTax || 0
        const sellingPrice = drug.sellingPrice || 0
        thisMonthProfit += (sellingPrice - purchasePrice) * item.quantity
      }
    }
  }

  return {
    totalSales,
    totalIncome,
    totalProfit,
    thisMonthProfit
  }
}

const getTotalIncomeAndSalesData = async (startDate: Date, endDate: Date) => {
  const totalIncomeResult = await prisma.sale.aggregate({
    _sum: {
      totalPrice: true
    },
    where: {
      date: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  const totalIncome = totalIncomeResult._sum.totalPrice || 0

  // return {
  //   totalSales,
  //   totalIncome
  // }
  return totalIncome
}

export const getSalesData = async () => {
  const now = new Date()

  // Total sale per day for the last 7 days
  const dailySales = []
  for (let i = 6; i >= 0; i--) {
    const startDate = startOfDay(subDays(now, i))
    const endDate = endOfDay(subDays(now, i))
    // const { totalSales, totalIncome } = await getTotalIncomeAndSalesData(startDate, endDate)
    const totalSales = await getTotalIncomeAndSalesData(startDate, endDate)
    dailySales.push({
      date: format(startDate, 'dd-MMMM-yyyy'),
      totalSales
      // totalIncome
    })
  }

  // Total sale per week for the last 4 weeks
  const weeklySales = []
  for (let i = 3; i >= 0; i--) {
    const startDate = startOfWeek(subWeeks(now, i))
    const endDate = endOfWeek(subWeeks(now, i))
    // const { totalSales, totalIncome } = await getTotalIncomeAndSalesData(startDate, endDate)
    const totalSales = await getTotalIncomeAndSalesData(startDate, endDate)
    weeklySales.push({
      weekStart: startDate,
      weekEnd: endDate,
      totalSales
      // totalIncome
    })
  }

  // Total sale per month for the last 12 months
  const monthlySales = []
  for (let i = 11; i >= 0; i--) {
    const startDate = startOfMonth(subMonths(now, i))
    const endDate = endOfMonth(subMonths(now, i))
    // const { totalSales, totalIncome } = await getTotalIncomeAndSalesData(startDate, endDate)
    const totalSales = await getTotalIncomeAndSalesData(startDate, endDate)
    monthlySales.push({
      month: format(startDate, 'MMMM yyyy'),
      totalSales
      // totalIncome
    })
  }

  return {
    dailySales,
    weeklySales,
    monthlySales,
    totalDailySales: dailySales.reduce((acc, cur) => acc + cur.totalSales, 0),
    // totalDailyIncome: dailySales.reduce((acc, cur) => acc + cur.totalIncome, 0),
    totalWeeklySales: weeklySales.reduce((acc, cur) => acc + cur.totalSales, 0),
    // totalWeeklyIncome: weeklySales.reduce((acc, cur) => acc + cur.totalIncome, 0),
    totalMonthlySales: monthlySales.reduce((acc, cur) => acc + cur.totalSales, 0)
    // totalMonthlyIncome: monthlySales.reduce((acc, cur) => acc + cur.totalIncome, 0)
  }
}

export const getRecentSales = async ({ limit = 5 }: RecentSalesParams) => {
  const recentSales = await prisma.sale.findMany({
    orderBy: {
      date: 'desc'
    },
    take: limit,
    select: {
      invoice: true,
      date: true,
      saleItems: true,
      totalPrice: true
    }
  })

  return recentSales.map((sale) => {
    let drugs: string[] = []
    if (Array.isArray(sale.saleItems)) {
      drugs = sale.saleItems.map((item: any) => item.drugName)
    }

    return {
      invoice: sale.invoice,
      date: sale.date,
      totalPrice: sale.totalPrice,
      drugs
    }
  })
}

interface GetAllSalesParams {
  date?: string
}

export const getAllSales = async ({ date }: GetAllSalesParams) => {
  const where = date
    ? {
        date: {
          gte: startOfDay(parseISO(date)),
          lte: endOfDay(parseISO(date))
        }
      }
    : {}

  const sales = await prisma.sale.findMany({
    where,
    orderBy: {
      date: 'desc'
    },
    select: {
      id: true,
      invoice: true,
      date: true,
      saleItems: true,
      totalPrice: true
    }
  })

  const salesWithDetails = await Promise.all(
    sales.map(async (sale) => {
      const saleItems =
        (sale.saleItems as unknown as Array<{
          drugName: string
          quantity: number
          discount?: number
        }>) || []

      const itemsWithDetails = await Promise.all(
        saleItems.map(async (item) => {
          const drug = await prisma.drug.findUnique({
            where: { name: item.drugName },
            select: {
              category: true,
              sellingPrice: true,
              purchasePriceAfterTax: true
            }
          })

          // Menghitung harga jual setelah diskon
          const discount = item.discount || 0
          const priceAfterDiscount = drug?.sellingPrice ? Math.max(drug.sellingPrice - discount, 0) : null

          return {
            drugName: item.drugName,
            drugCategory: drug ? drug.category : null,
            quantity: item.quantity,
            price: priceAfterDiscount,
            purchasePrice: drug ? drug.purchasePriceAfterTax : null,
            discount: discount // Tambahkan diskon ke dalam detail item
          }
        })
      )

      // Menghitung profit dengan memperhitungkan diskon
      const profit = itemsWithDetails.reduce((sum, item) => {
        if (item.price && item.purchasePrice) {
          return sum + (item.price - item.purchasePrice) * item.quantity
        }
        return sum
      }, 0)

      return {
        id: sale.id,
        invoice: sale.invoice,
        date: sale.date,
        totalPrice: sale.totalPrice,
        items: itemsWithDetails.map((item) => ({
          drugName: item.drugName,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount // Tampilkan diskon per item
        })),
        profit
      }
    })
  )

  return salesWithDetails
}

export const getSaleById = async (id: string) => {
  const sale = await prisma.sale.findUnique({
    where: {
      id
    }
  })

  if (!sale) {
    throw new Error('Invalid Sale id')
  }

  // Process each sale item to include selling price with applied discount
  const saleItemsWithPrice = await Promise.all(
    (sale.saleItems as any).map(async (item: SaleItem) => {
      // Find the selling price of the drug
      const drug = await prisma.drug.findUnique({
        where: { name: item.drugName },
        select: { sellingPrice: true }
      })

      // Calculate the final selling price after discount
      const sellingPrice = drug?.sellingPrice || 0
      const discount = item.discount || 0 // If no discount is provided, default to 0

      // Ensure that discount doesn't exceed the selling price
      const finalPrice = Math.max(sellingPrice - discount, 0)

      return {
        ...item,
        sellingPrice: finalPrice // Include the discounted selling price
      }
    })
  )

  return {
    id: sale.id,
    date: sale.date,
    invoice: sale.invoice,
    totalPrice: sale.totalPrice,
    username: sale.username,
    items: saleItemsWithPrice
  }
}

export const deleteSale = async (id: string) => {
  const saleToDelete = await prisma.sale.findUnique({
    where: {
      id
    }
  })

  if (!saleToDelete) {
    throw new Error('Invalid Id')
  }
  const currentItems = saleToDelete.saleItems as { drugName: string; quantity: number }[]

  await Promise.all(
    currentItems.map(async (item) => {
      await prisma.drug.update({
        where: { name: item.drugName },
        data: { quantity: { increment: item.quantity } }
      })
    })
  )

  await prisma.sale.delete({
    where: { id }
  })

  return { message: 'Sale deleted successfully' }
}

interface UpdateSaleParams {
  id: string
  date?: Date
  invoice?: string
  saleItems?: {
    drugName: string
    quantity: number
    discount?: number // Tambahkan discount per sale item
  }[]
  username?: string
}

export const updateSale = async ({ id, date, invoice, saleItems, username }: UpdateSaleParams) => {
  const existingSale = await prisma.sale.findUnique({
    where: { id },
    select: {
      id: true,
      saleItems: true
    }
  })

  if (!existingSale) {
    throw new Error('Sale not found')
  }

  // Create a map for the existing sale items
  const existingSaleItemsMap = new Map<string, number>()
  if (Array.isArray(existingSale.saleItems)) {
    ;(existingSale.saleItems as any[]).forEach((item) => {
      existingSaleItemsMap.set(item.drugName, item.quantity)
    })
  }

  // Update stock based on new sale items
  if (saleItems) {
    for (const item of saleItems) {
      const existingQuantity = existingSaleItemsMap.get(item.drugName) || 0
      const quantityDifference = item.quantity - existingQuantity

      // Update the drug stock
      await prisma.drug.update({
        where: { name: item.drugName },
        data: {
          quantity: {
            decrement: quantityDifference
          }
        }
      })
    }

    // Remove drugs that were in the original sale but are not in the updated sale
    for (const [drugName, quantity] of existingSaleItemsMap) {
      if (!saleItems.find((item) => item.drugName === drugName)) {
        await prisma.drug.update({
          where: { name: drugName },
          data: {
            quantity: {
              increment: quantity
            }
          }
        })
      }
    }
  }

  // Calculate the new totalPrice
  let totalPrice = 0
  if (saleItems) {
    for (const item of saleItems) {
      const drug = await prisma.drug.findUnique({
        where: {
          name: item.drugName
        }
      })

      if (!drug) {
        throw new Error(`Drug with name ${item.drugName} not found`)
      }

      // Calculate the price after applying discount
      const discount = item.discount || 0 // Default discount to 0 if not provided
      const priceAfterDiscount = Math.max((drug.sellingPrice || 0) - discount, 0) // Ensure price doesn't go below 0

      // Calculate the total price for the current item and add to totalPrice
      totalPrice += priceAfterDiscount * item.quantity
    }
  }

  // Update the sale in the database
  const updatedSale = await prisma.sale.update({
    where: { id },
    data: {
      date,
      invoice,
      totalPrice, // Update total price considering discounts
      username,
      saleItems: saleItems ? (saleItems as any) : undefined // Save updated saleItems
    }
  })

  return updatedSale
}

interface SaleItem {
  drugName: string
  quantity: number
}

interface Sale {
  saleItems: SaleItem[]
}

export const getSalesProfit = async () => {
  const now = new Date()

  // Helper function to calculate profit for a set of sales
  const calculateProfit = async (sales: Sale[]): Promise<number> => {
    let totalProfit = 0
    for (const sale of sales) {
      for (const item of sale.saleItems) {
        const drug = await prisma.drug.findUnique({
          where: { name: item.drugName },
          select: {
            purchasePriceAfterTax: true,
            sellingPrice: true
          }
        })

        if (drug) {
          const purchasePrice = drug.purchasePriceAfterTax || 0
          const sellingPrice = drug.sellingPrice || 0
          totalProfit += (sellingPrice - purchasePrice) * item.quantity
        }
      }
    }
    return totalProfit
  }

  // Convert JSON saleItems to SaleItem[]
  const parseSaleItems = (saleItems: any): SaleItem[] => {
    return saleItems as SaleItem[]
  }

  // Calculate daily profit for the last 7 days
  const dailySales = []
  const totalSales = await prisma.sale.count()
  let totalProfit7Days = 0

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0)
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999)

    const sales = await prisma.sale.findMany({
      where: {
        date: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      select: {
        saleItems: true
      }
    })

    const parsedSales = sales.map((sale) => ({
      saleItems: parseSaleItems(sale.saleItems)
    }))

    const dayProfit = await calculateProfit(parsedSales)
    totalProfit7Days += dayProfit

    dailySales.push({
      date: dayStart,
      totalSales: sales.length,
      totalProfit: dayProfit
    })
  }

  // Calculate weekly profit for the last 4 weeks
  const weeklySales = []
  let totalProfit4Weeks = 0

  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7 - 6, 0, 0, 0)
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7, 23, 59, 59, 999)

    const sales = await prisma.sale.findMany({
      where: {
        date: {
          gte: weekStart,
          lte: weekEnd
        }
      },
      select: {
        saleItems: true
      }
    })

    const parsedSales = sales.map((sale) => ({
      saleItems: parseSaleItems(sale.saleItems)
    }))

    const weekProfit = await calculateProfit(parsedSales)
    totalProfit4Weeks += weekProfit

    weeklySales.push({
      week: `${weekStart.toDateString()} - ${weekEnd.toDateString()}`,
      totalSales: sales.length,
      totalProfit: weekProfit
    })
  }

  // Calculate monthly profit for the last 12 months
  const monthlySales = []
  let totalProfit12Months = 0

  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)

    const sales = await prisma.sale.findMany({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      select: {
        saleItems: true
      }
    })

    const parsedSales = sales.map((sale) => ({
      saleItems: parseSaleItems(sale.saleItems)
    }))

    const monthProfit = await calculateProfit(parsedSales)
    totalProfit12Months += monthProfit

    monthlySales.push({
      month: monthStart.toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalSales: sales.length,
      totalProfit: monthProfit
    })
  }

  return {
    dailySales,
    totalProfit7Days,
    totalSales7Days: dailySales.reduce((acc, day) => acc + day.totalSales, 0),
    weeklySales,
    totalProfit4Weeks,
    totalSales4Weeks: weeklySales.reduce((acc, week) => acc + week.totalSales, 0),
    monthlySales,
    totalProfit12Months,
    totalSales12Months: monthlySales.reduce((acc, month) => acc + month.totalSales, 0)
  }
}

interface SaleItem {
  drugName: string
  quantity: number
  discount?: number
  sellingPrice?: number
  purchasePrice?: number
}

const calculateProfit = async (sales: any[]): Promise<number> => {
  let totalProfit = 0
  for (const sale of sales) {
    for (const item of sale.saleItems) {
      const drug = await prisma.drug.findUnique({
        where: { name: item.drugName },
        select: {
          purchasePriceAfterTax: true,
          sellingPrice: true
        }
      })

      if (drug) {
        const purchasePrice = drug.purchasePriceAfterTax || 0
        const sellingPrice = drug.sellingPrice || 0
        totalProfit += (sellingPrice - purchasePrice) * item.quantity
      }
    }
  }
  return totalProfit
}

const parseSaleItems = (saleItems: any): SaleItem[] => {
  return saleItems as SaleItem[]
}

export const getSalesDataRevenueProfit = async () => {
  const today = new Date()

  // 7 Days Aggregation
  let totalSales7Days = 0
  let totalRevenue7Days = 0
  let totalProfit7Days = 0

  const salesPerDay = await Promise.all(
    Array.from({ length: 7 })
      .reverse()
      .map(async (_, i) => {
        const date = subDays(today, 6 - i) // Change to get oldest first
        const startDate = startOfDay(date)
        const endDate = endOfDay(date)

        const [totalSales, totalRevenueResult, sales] = await Promise.all([
          prisma.sale.count({ where: { date: { gte: startDate, lte: endDate } } }),
          prisma.sale.aggregate({ where: { date: { gte: startDate, lte: endDate } }, _sum: { totalPrice: true } }),
          prisma.sale.findMany({ where: { date: { gte: startDate, lte: endDate } }, select: { saleItems: true } })
        ])

        const totalRevenue = totalRevenueResult._sum.totalPrice || 0
        const totalProfit = await calculateProfit(sales.map((sale) => ({ saleItems: parseSaleItems(sale.saleItems) })))

        totalSales7Days += totalSales
        totalRevenue7Days += totalRevenue
        totalProfit7Days += totalProfit

        return {
          date: date.toISOString().split('T')[0],
          totalSales,
          totalRevenue,
          totalProfit
        }
      })
  )

  // 4 Weeks Aggregation
  let totalSales4Weeks = 0
  let totalRevenue4Weeks = 0
  let totalProfit4Weeks = 0

  const salesPerWeek = await Promise.all(
    Array.from({ length: 4 })
      .reverse()
      .map(async (_, i) => {
        const startDate = startOfWeek(subWeeks(today, 3 - i)) // Change to get oldest first
        const endDate = endOfWeek(subWeeks(today, 3 - i)) // Change to get oldest first

        const [totalSales, totalRevenueResult, sales] = await Promise.all([
          prisma.sale.count({ where: { date: { gte: startDate, lte: endDate } } }),
          prisma.sale.aggregate({ where: { date: { gte: startDate, lte: endDate } }, _sum: { totalPrice: true } }),
          prisma.sale.findMany({ where: { date: { gte: startDate, lte: endDate } }, select: { saleItems: true } })
        ])

        const totalRevenue = totalRevenueResult._sum.totalPrice || 0
        const totalProfit = await calculateProfit(sales.map((sale) => ({ saleItems: parseSaleItems(sale.saleItems) })))

        totalSales4Weeks += totalSales
        totalRevenue4Weeks += totalRevenue
        totalProfit4Weeks += totalProfit

        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          totalSales,
          totalRevenue,
          totalProfit
        }
      })
  )

  // 12 Months Aggregation
  let totalSales12Months = 0
  let totalRevenue12Months = 0
  let totalProfit12Months = 0

  const salesPerMonth = await Promise.all(
    Array.from({ length: 12 })
      .reverse()
      .map(async (_, i) => {
        const startDate = startOfMonth(subMonths(today, 11 - i)) // Change to get oldest first
        const endDate = endOfMonth(subMonths(today, 11 - i)) // Change to get oldest first

        const [totalSales, totalRevenueResult, sales] = await Promise.all([
          prisma.sale.count({ where: { date: { gte: startDate, lte: endDate } } }),
          prisma.sale.aggregate({ where: { date: { gte: startDate, lte: endDate } }, _sum: { totalPrice: true } }),
          prisma.sale.findMany({ where: { date: { gte: startDate, lte: endDate } }, select: { saleItems: true } })
        ])

        const totalRevenue = totalRevenueResult._sum.totalPrice || 0
        const totalProfit = await calculateProfit(sales.map((sale) => ({ saleItems: parseSaleItems(sale.saleItems) })))

        totalSales12Months += totalSales
        totalRevenue12Months += totalRevenue
        totalProfit12Months += totalProfit

        return {
          month: format(endDate, 'MMMM yyyy'),
          totalSales,
          totalRevenue,
          totalProfit
        }
      })
  )

  return {
    salesPerDay,
    totalSales7Days,
    totalRevenue7Days,
    totalProfit7Days,
    salesPerWeek,
    totalSales4Weeks,
    totalRevenue4Weeks,
    totalProfit4Weeks,
    salesPerMonth,
    totalSales12Months,
    totalRevenue12Months,
    totalProfit12Months
  }
}

interface SaleItemPDF {
  drugName: string
  quantity: number
  sellingPrice: number
  discount?: number
}

export const generateDetailSale = async (id: string) => {
  const sale = await prisma.sale.findUnique({
    where: { id }
  })

  if (!sale || !sale.saleItems) {
    throw new Error('Sale not found or saleItems is null')
  }

  // Mengambil `saleItems` dan menambahkan informasi `sellingPrice` dan `discount`
  const saleItemsWithPriceAndDiscount = await Promise.all(
    (sale.saleItems as any).map(async (item: SaleItem) => {
      const drug = await prisma.drug.findUnique({
        where: { name: item.drugName },
        select: { sellingPrice: true }
      })

      return {
        ...item,
        sellingPrice: drug?.sellingPrice || 0, // Harga jual dari database
        discount: item.discount || 0 // Tambahkan diskon dari `saleItems`, default ke 0 jika tidak ada
      }
    })
  )

  // Menghitung total harga setelah diskon
  const totalPriceAfterDiscount = saleItemsWithPriceAndDiscount.reduce((total, item) => {
    const itemTotal = (item.sellingPrice - item.discount) * item.quantity
    return total + itemTotal
  }, 0)

  const result = {
    id: sale.id,
    invoice: sale.invoice,
    totalPrice: totalPriceAfterDiscount, // Update total price berdasarkan total setelah diskon
    saleItems: saleItemsWithPriceAndDiscount
  }

  const store = await getStoreData()
  if (!store) {
    throw new Error('store data not defined')
  }

  // Membuat PDF untuk detail penjualan
  const saleDetailPDF = await generateSaleDetailPDF(result, store)

  return { ...result, saleDetailPDF }
}

// Fungsi untuk format rupiah
const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number)
}

interface SaleData {
  id: string
  invoice: string
  totalPrice: number
  saleItems: SaleItemPDF[]
}

interface StoreData {
  id: number
  storeName: string
  address?: string
  logo?: any
  phone?: string
}

export const generateSaleDetailPDF = async (saleData: SaleData, storeData: StoreData): Promise<Buffer> => {
  const fonts = {
    Roboto: {
      normal: path.resolve(__dirname, '../fonts/Roboto-Regular.ttf'),
      bold: path.resolve(__dirname, '../fonts/Roboto-Bold.ttf'),
      italics: path.resolve(__dirname, '../fonts/Roboto-Italic.ttf'),
      bolditalics: path.resolve(__dirname, '../fonts/Roboto-BoldItalic.ttf')
    },
    Inter: {
      normal: path.resolve(__dirname, '../fonts/Inter/Inter-Regular.ttf'),
      bold: path.resolve(__dirname, '../fonts/Inter/Inter-Bold.ttf')
    }
  }

  const printer = new PdfPrinter(fonts)

  const docDefinition: TDocumentDefinitions = {
    content: [
      // Nama dan Alamat Toko
      { text: storeData.storeName, style: 'storeName', alignment: 'center' }, // Nama toko
      { text: storeData?.address || '', style: 'storeAddress', alignment: 'center' }, // Alamat toko
      { text: ' ' }, // Spacer

      // Judul Sale Detail dan Invoice
      { text: 'Sale Detail', style: 'title', alignment: 'center' },
      { text: saleData.invoice, style: 'invoice', alignment: 'center' },
      { text: ' ' }, // Spacer

      // Tabel yang menampilkan data item, quantity, harga, diskon, dan total
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto', 'auto'], // Tambahkan satu kolom untuk diskon
          body: [
            [
              { text: 'Item', style: 'tableHeader' },
              { text: 'Quantity', style: 'tableHeader' },
              { text: 'Price', style: 'tableHeader' },
              { text: 'Discount', style: 'tableHeader' }, // Header baru untuk kolom diskon
              { text: 'Total', style: 'tableHeader' }
            ],
            ...saleData.saleItems.map((item: SaleItemPDF) => [
              item.drugName,
              { text: item.quantity.toString(), margin: [0, 0, 10, 0] },
              formatRupiah(item.sellingPrice),
              formatRupiah((item.discount || 0) * item.quantity), // Diskon per item
              formatRupiah((item.sellingPrice - (item.discount || 0)) * item.quantity) // Total setelah diskon
            ])
          ]
        },
        layout: 'noBorders'
      },
      { text: ' ' }, // Spacer

      // Total Price
      {
        columns: [
          { text: 'Total Price', style: 'totalPriceLabel' },
          { text: formatRupiah(saleData.totalPrice), style: 'totalPriceValue', alignment: 'right' }
        ]
      }
    ],
    styles: {
      storeName: {
        fontSize: 16,
        bold: true,
        margin: [0, 0, 0, 5] // Margin untuk jarak antara nama toko dan alamat
      },
      storeAddress: {
        fontSize: 12,
        // italics: true,
        margin: [0, 0, 0, 10] // Margin untuk jarak antara alamat dan judul "Sale Detail"
      },
      title: {
        fontSize: 18,
        bold: true
      },
      invoice: {
        fontSize: 14,
        bold: false,
        margin: [0, 0, 0, 20]
      },
      tableHeader: {
        bold: true
      },
      totalPriceLabel: {
        bold: true
      },
      totalPriceValue: {
        bold: true
      }
    },
    defaultStyle: {
      font: 'Inter'
    }
  }

  const pdfDoc = printer.createPdfKitDocument(docDefinition)
  const chunks: Uint8Array[] = []

  return new Promise<Buffer>((resolve, reject) => {
    pdfDoc.on('data', (chunk) => chunks.push(chunk))
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)))
    pdfDoc.on('error', reject)
    pdfDoc.end()
  })
}
