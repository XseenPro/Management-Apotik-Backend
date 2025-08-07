import { Prisma, PrismaClient } from '@prisma/client'
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
  parseISO
} from 'date-fns'

const prisma = new PrismaClient()

export interface CreatePurchaseInput {
  date: Date
  supplier: string
  status: 'Pending' | 'On Delivery' | 'Completed'
  purchaseItems: { drugName: string; quantity: number }[]
  invoice: string
  username: string
}

export const createPurchase = async (data: CreatePurchaseInput) => {
  const { date, supplier, status, purchaseItems, invoice, username } = data

  // Validate status
  const validStatuses = ['Pending', 'On Delivery', 'Completed']
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status')
  }

  let totalPrice = 0

  if (status === 'Completed') {
    // Update drug quantities and calculate totalPrice
    for (const item of purchaseItems) {
      const drug = await prisma.drug.findUnique({
        where: {
          name: item.drugName
        }
      })

      if (!drug) {
        throw new Error(`Drug with name ${item.drugName} not found`)
      }

      await prisma.drug.update({
        where: {
          name: item.drugName
        },
        data: {
          quantity: drug.quantity + item.quantity
        }
      })

      totalPrice += drug.purchasePriceAfterTax * item.quantity
    }
  } else {
    // Calculate totalPrice without updating drug quantities
    for (const item of purchaseItems) {
      const drug = await prisma.drug.findUnique({
        where: {
          name: item.drugName
        }
      })

      if (!drug) {
        throw new Error(`Drug with name ${item.drugName} not found`)
      }

      totalPrice += drug.purchasePriceAfterTax * item.quantity
    }
  }

  // Create purchase
  const newPurchase = await prisma.purchase.create({
    data: {
      date,
      supplierName: supplier,
      status,
      purchaseItems: purchaseItems as any,
      invoice,
      totalPrice,
      username
    }
  })

  return {
    id: newPurchase.id,
    date: newPurchase.date,
    status: newPurchase.status,
    invoice: newPurchase.invoice,
    totalPrice: newPurchase.totalPrice,
    supplier: newPurchase.supplierName,
    username: newPurchase.username,
    purchaseItems: newPurchase.purchaseItems
  }
}

interface GetAllPurchasesInput {
  date?: Date
  status?: string
}

export const getAllPurchases = async ({ date, status }: GetAllPurchasesInput) => {
  const where: any = {}

  if (date) {
    const startDate = new Date(date)
    startDate.setUTCHours(0, 0, 0, 0)
    const endDate = new Date(date)
    endDate.setUTCHours(23, 59, 59, 999)

    where.date = {
      gte: startDate,
      lte: endDate
    }
  }

  if (status) {
    where.status = status
  }

  const purchases = await prisma.purchase.findMany({
    where,
    include: {
      supplier: true,
      user: true
    },
    orderBy: {
      date: 'desc'
    }
  })

  // Process the purchase items to get the required format
  const processedPurchases = await Promise.all(
    purchases.map(async (purchase) => {
      const items = purchase.purchaseItems as unknown as { drugName: string; quantity: number }[]
      const uniqueCategories = new Set<string>()
      const processedItems = await Promise.all(
        items.map(async (item) => {
          const drug = await prisma.drug.findUnique({ where: { name: item.drugName } })
          if (drug) {
            uniqueCategories.add(drug.category)
            return {
              drugName: item.drugName,
              quantity: item.quantity,
              price: drug.purchasePriceAfterTax,
              category: drug.category
            }
          }
          return {
            drugName: item.drugName,
            quantity: item.quantity,
            price: 0,
            category: 'Unknown'
          }
        })
      )

      return {
        id: purchase.id,
        invoice: purchase.invoice,
        date: purchase.date,
        status: purchase.status,
        supplier: purchase.supplierName,
        items: processedItems.map((item) => ({
          drugName: item.drugName,
          drugCategory: item.category,
          drugQuantity: item.quantity,
          drugPrice: item.price
        })),
        totalPrice: purchase.totalPrice
      }
    })
  )

  return processedPurchases
}

export const getRecentPurchases = async (limit: number = 3) => {
  const purchases = await prisma.purchase.findMany({
    orderBy: {
      date: 'desc'
    },
    take: limit,
    select: {
      invoice: true,
      date: true,
      totalPrice: true,
      supplier: {
        select: {
          name: true
        }
      }
    }
  })

  return purchases.map((purchase) => ({
    invoice: purchase.invoice,
    date: purchase.date,
    totalPrice: purchase.totalPrice,
    supplier: purchase.supplier.name
  }))
}

const timeZone = 'Asia/Jakarta'

export const getPurchaseGraphData = async () => {
  const now = toZonedTime(new Date(), timeZone)

  // Total Purchase Per Hari selama 7 Hari Terakhir
  const dailyStatsPromises = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(now, 6 - i)
    return prisma.purchase
      .aggregate({
        where: {
          date: {
            gte: startOfDay(date),
            lte: endOfDay(date)
          }
        },
        _count: {
          id: true
        },
        _sum: {
          totalPrice: true
        }
      })
      .then((stats) => ({
        date: format(date, 'yyyy-MM-dd'),
        totalPurchases: stats._count.id,
        totalSpent: stats._sum.totalPrice || 0
      }))
  })

  const dailyStats = await Promise.all(dailyStatsPromises)
  const totalPurchases7Days = dailyStats.reduce((acc, stats) => acc + stats.totalPurchases, 0)
  const totalSpent7Days = dailyStats.reduce((acc, stats) => acc + stats.totalSpent, 0)

  // Total Purchase Per Pekan selama 4 Pekan Terakhir
  const weeklyStatsPromises = Array.from({ length: 4 }, (_, i) => {
    const startDate = startOfWeek(subWeeks(now, 3 - i))
    const endDate = endOfWeek(startDate)
    return prisma.purchase
      .aggregate({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          id: true
        },
        _sum: {
          totalPrice: true
        }
      })
      .then((stats) => ({
        week: format(startDate, 'yyyy-MM-dd') + ' to ' + format(endDate, 'yyyy-MM-dd'),
        totalPurchases: stats._count.id,
        totalSpent: stats._sum.totalPrice || 0
      }))
  })

  const weeklyStats = await Promise.all(weeklyStatsPromises)
  const totalPurchases4Weeks = weeklyStats.reduce((acc, stats) => acc + stats.totalPurchases, 0)
  const totalSpent4Weeks = weeklyStats.reduce((acc, stats) => acc + stats.totalSpent, 0)

  // Total Purchase Per Bulan selama 12 Bulan Terakhir
  const monthlyStatsPromises = Array.from({ length: 12 }, (_, i) => {
    const startDate = startOfMonth(subMonths(now, 11 - i))
    const endDate = endOfMonth(startDate)
    return prisma.purchase
      .aggregate({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          id: true
        },
        _sum: {
          totalPrice: true
        }
      })
      .then((stats) => ({
        month: format(startDate, 'MMMM yyyy'),
        totalPurchases: stats._count.id,
        totalSpent: stats._sum.totalPrice || 0
      }))
  })

  const monthlyStats = await Promise.all(monthlyStatsPromises)
  const totalPurchases12Months = monthlyStats.reduce((acc, stats) => acc + stats.totalPurchases, 0)
  const totalSpent12Months = monthlyStats.reduce((acc, stats) => acc + stats.totalSpent, 0)

  return {
    dailyStats,
    weeklyStats,
    monthlyStats,
    totalPurchases7Days,
    totalSpent7Days,
    totalPurchases4Weeks,
    totalSpent4Weeks,
    totalPurchases12Months,
    totalSpent12Months
  }
}

export const getPurchaseOverview = async () => {
  const totalSpent = await prisma.purchase.aggregate({
    _sum: {
      totalPrice: true
    }
  })

  const completedPurchases = await prisma.purchase.count({
    where: {
      status: 'Completed'
    }
  })

  const pendingPurchases = await prisma.purchase.count({
    where: {
      status: 'Pending'
    }
  })

  const onDeliveryPurchases = await prisma.purchase.count({
    where: {
      status: 'On Delivery'
    }
  })

  return {
    totalSpent: totalSpent._sum.totalPrice || 0,
    totalCompletedPurchases: completedPurchases,
    totalPendingPurchases: pendingPurchases,
    totalOnDeliveryPurchases: onDeliveryPurchases
  }
}

interface UpdatePurchaseInput {
  id: string
  date?: Date
  supplier?: string
  status?: string
  purchaseItems?: { drugName: string; quantity: number }[]
}

export const updatePurchase = async ({ id, date, supplier, status, purchaseItems }: UpdatePurchaseInput) => {
  const existingPurchase = await prisma.purchase.findUnique({
    where: { id }
  })

  if (!existingPurchase) {
    throw new Error('Purchase not found')
  }

  const currentStatus = existingPurchase.status
  const currentItems = existingPurchase.purchaseItems as { drugName: string; quantity: number }[]

  // Adjust drug quantities based on status change
  if (status && currentStatus !== status) {
    if (currentStatus === 'Completed' && (status === 'On Delivery' || status === 'Pending')) {
      // Reduce drug quantity
      await Promise.all(
        currentItems.map(async (item) => {
          await prisma.drug.update({
            where: { name: item.drugName },
            data: { quantity: { decrement: item.quantity } }
          })
        })
      )
    } else if ((currentStatus === 'On Delivery' || currentStatus === 'Pending') && status === 'Completed') {
      // Increase drug quantity
      await Promise.all(
        currentItems.map(async (item) => {
          await prisma.drug.update({
            where: { name: item.drugName },
            data: { quantity: { increment: item.quantity } }
          })
        })
      )
    }
  }

  // Adjust drug quantities based on purchase items change if status is 'Completed'
  if (status === 'Completed' && purchaseItems) {
    const existingItemsMap = new Map(currentItems.map((item) => [item.drugName, item.quantity]))
    const newItemsMap = new Map(purchaseItems.map((item) => [item.drugName, item.quantity]))

    for (const [drugName, newQuantity] of newItemsMap) {
      const currentQuantity = existingItemsMap.get(drugName) || 0
      const quantityChange = newQuantity - currentQuantity

      if (quantityChange !== 0) {
        await prisma.drug.update({
          where: { name: drugName },
          data: { quantity: { increment: quantityChange } }
        })
      }
    }

    for (const [drugName, currentQuantity] of existingItemsMap) {
      if (!newItemsMap.has(drugName)) {
        await prisma.drug.update({
          where: { name: drugName },
          data: { quantity: { decrement: currentQuantity } }
        })
      }
    }
  }

  // Calculate the new totalPrice
  let totalPrice = 0
  if (purchaseItems) {
    for (const item of purchaseItems) {
      const drug = await prisma.drug.findUnique({
        where: {
          name: item.drugName
        }
      })

      if (!drug) {
        throw new Error(`Drug with name ${item.drugName} not found`)
      }

      totalPrice += drug.purchasePriceAfterTax * item.quantity
    }
  }

  const updatedPurchase = await prisma.purchase.update({
    where: { id },
    data: {
      date,
      supplierName: supplier,
      status,
      purchaseItems: purchaseItems ? purchaseItems : undefined,
      totalPrice
    }
  })

  return {
    id: updatedPurchase.id,
    date: updatedPurchase.date,
    status: updatedPurchase.status,
    invoice: updatedPurchase.invoice,
    totalPrice: updatedPurchase.totalPrice,
    supplier: updatedPurchase.supplierName,
    username: updatedPurchase.username,
    purchaseItems: updatedPurchase.purchaseItems
  }
}

export const deletePurchase = async (purchaseId: string) => {
  const existingPurchase = await prisma.purchase.findUnique({
    where: { id: purchaseId }
  })

  if (!existingPurchase) {
    throw new Error('Purchase not found')
  }

  const currentItems = existingPurchase.purchaseItems as { drugName: string; quantity: number }[]

  // Adjust drug quantities if the purchase is in "Completed" status
  if (existingPurchase.status === 'Completed') {
    await Promise.all(
      currentItems.map(async (item) => {
        await prisma.drug.update({
          where: { name: item.drugName },
          data: { quantity: { decrement: item.quantity } }
        })
      })
    )
  }

  await prisma.purchase.delete({
    where: { id: purchaseId }
  })

  return { message: 'Purchase deleted successfully' }
}

export const getLastInvoice = async (date: Date) => {
  const today = toZonedTime(date, timeZone)

  const startOfDay = fromZonedTime(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0), timeZone)

  const endOfDay = fromZonedTime(
    new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999),
    timeZone
  )

  const lastInvoice = await prisma.purchase.findMany({
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
    const nextInvoice = `INV-P-${datePart}-${String(nextInvoiceId).padStart(2, '0')}`
    return {
      lastInvoice: lastInvoice[0].invoice,
      nextInvoice
    }
  }

  const nextInvoice = `INV-P-${datePart}-${String(nextInvoiceId).padStart(2, '0')}`
  return {
    lastInvoice: null,
    nextInvoice
  }
}

export const getPurchaseById = async (id: string) => {
  const purchase = await prisma.purchase.findUnique({
    where: {
      id
    },
    select: {
      id: true,
      date: true,
      status: true,
      invoice: true,
      totalPrice: true,
      supplierName: true,
      username: true,
      purchaseItems: true
    }
  })

  if (!purchase) {
    throw new Error('Invalid Purchase id')
  }

  let itemsWithPurchasePrice

  if (purchase.purchaseItems) {
    const itemsArray = purchase.purchaseItems as unknown as { drugName: string; quantity: number }[]
    itemsWithPurchasePrice = await Promise.all(
      itemsArray.map(async (item: any) => {
        const drug = await prisma.drug.findUnique({
          where: {
            name: item.drugName
          },
          select: {
            purchasePriceAfterTax: true
          }
        })

        if (!drug) {
          throw new Error(`Drug ${item.drugName} not found`)
        }

        return {
          ...item,
          purchasePrice: drug.purchasePriceAfterTax
        }
      })
    )
  }

  return {
    id: purchase.id,
    date: purchase.date,
    status: purchase.status,
    invoice: purchase.invoice,
    totalPrice: purchase.totalPrice,
    supplier: purchase.supplierName,
    username: purchase.username,
    items: itemsWithPurchasePrice
  }
}
