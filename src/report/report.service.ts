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
import PdfPrinter from 'pdfmake'
import { TDocumentDefinitions } from 'pdfmake/interfaces'
import fs from 'fs'
import path from 'path'
import { getStoreData } from '../store/store.service'

const prisma = new PrismaClient()

export const getCurrentMonthRecap = async () => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  // Get total revenue
  const totalRevenueResult = await prisma.sale.aggregate({
    _sum: {
      totalPrice: true
    },
    where: {
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  })

  const totalRevenue = totalRevenueResult._sum.totalPrice || 0

  // Get COGS
  const sales = await prisma.sale.findMany({
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

  let totalCOGS = 0

  for (const sale of sales) {
    const saleItems = (sale.saleItems as unknown as { drugName: string; quantity: number }[]) || []

    for (const item of saleItems) {
      const drug = await prisma.drug.findUnique({
        where: { name: item.drugName },
        select: { purchasePriceAfterTax: true }
      })

      if (drug) {
        totalCOGS += (drug.purchasePriceAfterTax || 0) * item.quantity
      }
    }
  }

  // Calculate total gross profit/loss
  const totalGrossProfitLoss = totalRevenue - totalCOGS

  return {
    totalRevenue,
    totalCOGS,
    totalGrossProfitLoss
  }
}

export const getMonthlyRevenueAndCOGS = async () => {
  const currentDate = new Date()
  const monthlyData = []

  for (let i = 0; i < 12; i++) {
    const startDate = startOfMonth(subMonths(currentDate, i))
    const endDate = endOfMonth(subMonths(currentDate, i))

    // Calculate revenue
    const revenueResult = await prisma.sale.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        totalPrice: true
      }
    })

    // Calculate COGS
    const sales = await prisma.sale.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        saleItems: true
      }
    })

    let totalCOGS = 0
    for (const sale of sales) {
      const saleItems = sale.saleItems as unknown as Array<{ drugName: string; quantity: number }>
      for (const item of saleItems) {
        const drug = await prisma.drug.findUnique({
          where: { name: item.drugName },
          select: { purchasePriceAfterTax: true }
        })
        if (drug && drug.purchasePriceAfterTax) {
          totalCOGS += drug.purchasePriceAfterTax * item.quantity
        }
      }
    }

    monthlyData.push({
      month: format(startDate, 'yyyy-MM'),
      revenue: revenueResult._sum.totalPrice || 0,
      cogs: totalCOGS
    })
  }

  return monthlyData.reverse() // Reverse to get chronological order
}

export const getYearlyRevenueAndCOGS = async () => {
  const currentDate = new Date()
  const yearlyData = []

  for (let i = 0; i < 5; i++) {
    const startDate = new Date(currentDate.getFullYear() - i, 0, 1)
    const endDate = new Date(currentDate.getFullYear() - i, 11, 31, 23, 59, 59)

    // Calculate revenue
    const revenueResult = await prisma.sale.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        totalPrice: true
      }
    })

    // Calculate COGS
    const sales = await prisma.sale.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        saleItems: true
      }
    })

    let totalCOGS = 0
    for (const sale of sales) {
      const saleItems = sale.saleItems as unknown as Array<{ drugName: string; quantity: number }>
      for (const item of saleItems) {
        const drug = await prisma.drug.findUnique({
          where: { name: item.drugName },
          select: { purchasePriceAfterTax: true }
        })
        if (drug && drug.purchasePriceAfterTax) {
          totalCOGS += drug.purchasePriceAfterTax * item.quantity
        }
      }
    }

    yearlyData.push({
      year: startDate.getFullYear(),
      revenue: revenueResult._sum.totalPrice || 0,
      cogs: totalCOGS
    })
  }

  return yearlyData.reverse() // Reverse to get chronological order
}

interface GetNetIncomeEstimationParams {
  startDate: string
  endDate: string
  operationCost: number
  taxPercentage: number
}

export const getNetIncomeEstimation = async ({
  startDate,
  endDate,
  operationCost,
  taxPercentage
}: GetNetIncomeEstimationParams) => {
  const start = startOfDay(parseISO(startDate))
  const end = endOfDay(parseISO(endDate))

  // Calculate total revenue
  const revenueResult = await prisma.sale.aggregate({
    where: {
      date: {
        gte: start,
        lte: end
      }
    },
    _sum: {
      totalPrice: true
    }
  })

  const totalRevenue = revenueResult._sum.totalPrice || 0

  // Calculate COGS
  const sales = await prisma.sale.findMany({
    where: {
      date: {
        gte: start,
        lte: end
      }
    },
    select: {
      saleItems: true
    }
  })

  let totalCOGS = 0
  for (const sale of sales) {
    const saleItems = sale.saleItems as unknown as Array<{ drugName: string; quantity: number }>
    for (const item of saleItems) {
      const drug = await prisma.drug.findUnique({
        where: { name: item.drugName },
        select: { purchasePriceAfterTax: true }
      })
      if (drug && drug.purchasePriceAfterTax) {
        totalCOGS += drug.purchasePriceAfterTax * item.quantity
      }
    }
  }

  const totalGrossProfit = totalRevenue - totalCOGS
  const taxes = totalGrossProfit * (taxPercentage / 100)
  const netIncome = totalGrossProfit - operationCost - taxes

  const result = {
    startDate,
    endDate,
    operationCost,
    taxPercentage,
    taxes,
    totalRevenue,
    COGS: totalCOGS,
    totalGrossProfit,
    netIncome
  }

  const existingReport = await prisma.report.findFirst()
  if (!existingReport) {
    const newReport = await prisma.report.create({
      data: {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        operationCost,
        taxPercentage,
        taxes,
        totalRevenue,
        COGS: totalCOGS,
        totalGrossProfit,
        netIncome
      }
    })
  } else {
    const updatedReport = await prisma.report.update({
      where: { id: 1 },
      data: {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        operationCost,
        taxPercentage,
        taxes,
        totalRevenue,
        COGS: totalCOGS,
        totalGrossProfit,
        netIncome
      }
    })
  }
  const store = await getStoreData()

  if (!store) {
    throw new Error('store data not defined')
  }

  // Generate PDF
  const pdfDoc = await generatePDF(result, store)

  return { result, pdfDoc }
}

interface StoreData {
  id: number
  storeName: string
  address?: string
  logo?: any
  phone?: string
}

export const getPDFReport = async () => {
  const report = await prisma.report.findFirst()
  const store = await getStoreData()

  if (!store) {
    throw new Error('store data not defined')
  }

  const pdfDoc = await generatePDF(report, store)
  return pdfDoc
}

// Fungsi untuk format rupiah
const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number)
}

const generatePDF = async (data: any, storeData: StoreData) => {
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
  const now = format(new Date(), 'dd/MM/yyyy HH:mm')
  const startDate = format(data.startDate, 'dd/MM/yyyy')
  const endDate = format(data.endDate, 'dd/MM/yyyy')

  const docDefinition: TDocumentDefinitions = {
    content: [
      { text: 'Laporan Keuangan', style: 'title', alignment: 'center' },
      { text: storeData.storeName, style: 'title', alignment: 'center' },
      { text: storeData?.address || '', style: 'storeAddress', alignment: 'center' }, // Alamat toko
      { text: `Periode : ${startDate} - ${endDate}`, style: 'subheader', alignment: 'center' },
      { text: `Dibuat pada: ${now}`, style: 'subheader', alignment: 'center' },
      { text: ' ', margin: [0, 10] }, // Spacer
      {
        columns: [
          { text: 'Total Pendapatan', style: 'content' },
          { text: formatRupiah(data.totalRevenue), style: 'content', alignment: 'right' }
        ]
      },
      {
        columns: [
          { text: 'Harga Pokok Penjualan (HPP)', style: 'content' },
          { text: formatRupiah(data.COGS), style: 'content', alignment: 'right' }
        ]
      },
      { text: ' ', margin: [0, 0] }, // Spacer
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 515, // The width of the line
            y2: 0,
            lineWidth: 1,
            lineColor: '#000000'
          }
        ]
      },
      { text: '(-)', style: 'content', alignment: 'right' },
      // { text: ' ', margin: [0, 0] }, // Spacer
      {
        columns: [
          { text: 'Total Laba/Rugi Kotor', style: 'content' },
          { text: formatRupiah(data.totalGrossProfit), style: 'content', alignment: 'right' }
        ]
      },
      {
        columns: [
          { text: 'Biaya Operasional', style: 'content' },
          { text: formatRupiah(data.operationCost), style: 'content', alignment: 'right' }
        ]
      },
      { text: ' ', margin: [0, 0] }, // Spacer
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 515, // The width of the line
            y2: 0,
            lineWidth: 1,
            lineColor: '#000000'
          }
        ]
      },
      { text: '(-)', style: 'content', alignment: 'right' },
      // { text: ' ', margin: [0, 0] }, // Spacer
      {
        columns: [
          { text: 'Total Laba/Rugi Bersih sebelum pajak', style: 'content' },
          { text: formatRupiah(data.netIncome - data.taxes), style: 'content', alignment: 'right' }
        ]
      },
      {
        columns: [
          { text: `Pajak (${data.taxPercentage}%)`, style: 'content' },
          { text: formatRupiah(data.taxes), style: 'content', alignment: 'right' }
        ]
      },
      { text: ' ', margin: [0, 0] }, // Spacer
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 515, // The width of the line
            y2: 0,
            lineWidth: 1,
            lineColor: '#000000'
          }
        ]
      },
      { text: '(-)', style: 'content', alignment: 'right' },
      // { text: ' ', margin: [0, 0] }, // Spacer
      {
        columns: [
          { text: 'Total Laba/Rugi Bersih setelah pajak', style: 'content' },
          { text: formatRupiah(data.netIncome), style: 'content', alignment: 'right' }
        ]
      },
      { text: '-', style: 'endDash', alignment: 'right' } // Adding the dash at the end
    ],
    styles: {
      title: {
        fontSize: 24,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      storeAddress: {
        fontSize: 15,
        // bold: true,
        margin: [0, 0, 0, 10] // Margin untuk jarak antara alamat dan judul "Sale Detail"
      },
      subheader: {
        fontSize: 13,
        margin: [0, 5, 0, 5]
      },
      content: {
        fontSize: 12,
        margin: [0, 5, 0, 5]
      },
      endDash: {
        fontSize: 12,
        margin: [0, 5, 0, 5]
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
