import { Prisma, PrismaClient } from '@prisma/client'
import DrugType from './drug.type'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { Readable } from 'stream'
import fs from 'fs'
import csv from 'csv-parser'
import xlsx from 'xlsx'
import * as XLSX from 'xlsx'
import csvParser from 'csv-parser'

const prisma = new PrismaClient()
export default interface GetDrugsWithFiltersRequest {
  page: number
  limit: number
  name?: string
  categoryName?: string
  unitName?: string
}

export const getDrugByName = async (name: string) => {
  return prisma.drug.findUnique({
    where: { name }
  })
}

export const fetchCategoryId = async (categoryNames: string[]) => {
  const categories = await prisma.category.findMany({
    where: {
      name: {
        in: categoryNames
      }
    },
    select: {
      id: true
    }
  })

  return categories.map((category) => category.id)
}

export const createDrug = async (drugData: DrugType) => {
  // Set default values if not provided
  const margin = drugData.margin ?? 0
  const quantity = drugData.quantity ?? 0
  const expiredDate = drugData.expiredDate ?? new Date(new Date().setFullYear(new Date().getFullYear() + 1))

  const purchasePriceAfterTax =
    drugData.tax === 0 ? drugData.purchasePrice : drugData.purchasePrice * (1 + drugData.tax / 100)
  const sellingPrice = purchasePriceAfterTax * (1 + margin / 100)

  return await prisma.drug.create({
    data: {
      margin: drugData.margin,
      name: drugData.name,
      description: drugData.description,
      category: drugData.category,
      tax: drugData.tax,
      purchasePriceBeforeTax: drugData.purchasePrice,
      purchasePriceAfterTax,
      sellingPrice,
      quantity: quantity,
      unitName: drugData.unitName,
      expiredDate: expiredDate,
      supplierName: drugData.supplierName,
      batchNo: drugData.batchNo
    }
  })
}

export const fetchAllDrug = async () => {
  return await prisma.drug.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      tax: true,
      purchasePriceBeforeTax: true,
      purchasePriceAfterTax: true,
      sellingPrice: true,
      quantity: true,
      unitName: true,
      expiredDate: true,
      supplierName: true,
      margin: true,
      batchNo: true
    }
  })
}

export const fetchDrugById = async (id: string) => {
  return await prisma.drug.findUnique({
    where: {
      id
    }
  })
}

export const fetchExpiredDrug = async () => {
  const today = new Date()
  return await prisma.drug.findMany({
    where: {
      expiredDate: {
        lt: today
      }
    }
  })
}

export const fetchOutOfStockDrug = async () => {
  return await prisma.drug.findMany({
    where: {
      quantity: {
        lte: 0
      }
    }
  })
}

export const getDrugsWithFilters = async (getDrugsWithFilters: GetDrugsWithFiltersRequest) => {
  const where: any = {}

  if (getDrugsWithFilters.name) {
    where.name = { contains: getDrugsWithFilters.name, mode: Prisma.QueryMode.insensitive }
  }

  if (getDrugsWithFilters.categoryName) {
    where.category = getDrugsWithFilters.categoryName
  }

  if (getDrugsWithFilters.unitName) {
    where.unitName = getDrugsWithFilters.unitName
  }

  const drugs = await prisma.drug.findMany({
    where,
    skip: (getDrugsWithFilters.page - 1) * getDrugsWithFilters.limit,
    take: getDrugsWithFilters.limit
  })

  const totalDrugs = await prisma.drug.count({ where })

  return {
    data: drugs,
    total: totalDrugs,
    page: getDrugsWithFilters.page,
    limit: getDrugsWithFilters.limit
  }
}

export const deleteDrug = async (id: string) => {
  return prisma.drug.delete({
    where: {
      id
    }
  })
}

export const fetchAlmostExpiredDrugs = async (limit: number = 5) => {
  return await prisma.drug.findMany({
    orderBy: {
      expiredDate: 'asc'
    },
    take: limit,
    select: {
      id: true,
      name: true,
      quantity: true,
      expiredDate: true
    }
  })
}

export const updateDrug = async (id: string, drugData: Partial<DrugType>) => {
  const currentData = await prisma.drug.findUnique({ where: { id } })

  if (!currentData) {
    throw new Error('Invalid Drug Id')
  }

  const purchasePriceAfterTax =
    drugData.purchasePrice && drugData.tax
      ? drugData.purchasePrice * (1 + drugData.tax / 100)
      : currentData.purchasePriceAfterTax
  const sellingPrice = drugData.margin
    ? purchasePriceAfterTax * (1 + drugData.margin / 100)
    : purchasePriceAfterTax * (1 + currentData.margin / 100)

  // Update drug data in the database
  const updatedDrug = await prisma.drug.update({
    where: { id },
    data: {
      name: drugData.name,
      description: drugData.description,
      category: drugData.category,
      purchasePriceBeforeTax: drugData.purchasePrice,
      purchasePriceAfterTax,
      tax: drugData.tax,
      sellingPrice,
      quantity: drugData.quantity,
      unitName: drugData.unitName,
      margin: drugData.margin,
      batchNo: drugData.batchNo,
      expiredDate: drugData.expiredDate,
      supplierName: drugData.supplierName
    }
  })

  return updatedDrug
}

const timeZone = 'Asia/Jakarta'

export const getDrugStatistics = async () => {
  const now = new Date()
  const currentDate = toZonedTime(now, timeZone)

  const totalDrugs = await prisma.drug.count()

  const totalQuantity = await prisma.drug.aggregate({
    _sum: {
      quantity: true
    }
  })

  const expiredDrugs = await prisma.drug.count({
    where: {
      expiredDate: {
        lte: currentDate
      }
    }
  })

  const outOfStockDrugs = await prisma.drug.count({
    where: {
      quantity: 0
    }
  })

  return {
    totalDrugs,
    totalQuantity: totalQuantity._sum.quantity || 0,
    expiredDrugs,
    outOfStockDrugs
  }
}

export const addDrugsFromFileService = async (drugDataArray: DrugType[]) => {
  const addedDrugs = []
  const drugArray = drugDataArray[0].name ? drugDataArray : transformData(drugDataArray)

  for (const drugData of drugArray) {
    if (!drugData.name) {
      throw new Error(`"name" column cannot be empty in the data: ${JSON.stringify(drugData)}`)
    }

    if (!drugData.category) {
      throw new Error(`"category" column cannot be empty in the data: ${JSON.stringify(drugData)}`)
    }

    if (!drugData.purchasePrice && drugData.purchasePrice !== 0) {
      throw new Error(`"purchasePrice" column cannot be empty in the data: ${JSON.stringify(drugData)}`)
    }

    if (!drugData.unitName) {
      throw new Error(`"unitName" column cannot be empty in the data: ${JSON.stringify(drugData)}`)
    }

    if (!drugData.supplierName) {
      throw new Error(`"supplierName" column cannot be empty in the data: ${JSON.stringify(drugData)}`)
    }
    const category = await prisma.category.upsert({
      where: { name: drugData.category },
      update: {},
      create: { name: drugData.category }
    })

    // Check and create Unit if not exists
    const unit = await prisma.unit.upsert({
      where: { name: drugData.unitName },
      update: {},
      create: { name: drugData.unitName }
    })

    // Check and create Supplier if not exists
    const supplier = await prisma.supplier.upsert({
      where: { name: drugData.supplierName },
      update: {},
      create: { name: drugData.supplierName, address: '-', phone: '-' }
    })
    // Calculate purchasePriceAfterTax and sellingPrice
    const purchasePriceAfterTax = drugData.purchasePrice * (1 + drugData.tax / 100)
    const sellingPrice = purchasePriceAfterTax * (1 + drugData.margin / 100)

    // Create each drug entry in the database
    const newDrug = await prisma.drug.create({
      data: {
        name: drugData.name,
        description: drugData.description,
        category: drugData.category,
        purchasePriceBeforeTax: drugData.purchasePrice,
        purchasePriceAfterTax: purchasePriceAfterTax,
        tax: drugData.tax,
        sellingPrice: sellingPrice,
        quantity: drugData.quantity ? drugData.quantity : 0,
        unitName: drugData.unitName,
        margin: drugData.margin,
        batchNo: drugData.batchNo,
        expiredDate: drugData.expiredDate,
        supplierName: drugData.supplierName
      }
    })

    addedDrugs.push(newDrug)
  }

  return addedDrugs
}

export const parseCSV = (buffer: Buffer): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const parsedData: any[] = []
    const stream = Readable.from(buffer.toString())

    stream
      .pipe(csvParser())
      .on('data', (row) => {
        parsedData.push(row)
      })
      .on('end', () => {
        resolve(parsedData)
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

export const parseExcel = (buffer: Buffer): any[] => {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true })
  return jsonData as any[]
}

function formatDate(date: string): string {
  const parsedDate = new Date(date)
  return parsedDate.toISOString()
}

function transformData(data: any[]) {
  return data.map((item) => {
    const csvData = item[Object.keys(item)[0]]

    const [
      name,
      description,
      category,
      purchasePrice,
      tax,
      quantity,
      unitName,
      margin,
      batchNo,
      expiredDate,
      supplierName
    ] = csvData.split(',')

    return {
      name,
      description,
      category,
      purchasePrice: parseFloat(purchasePrice),
      tax: parseFloat(tax),
      quantity: parseInt(quantity, 10),
      unitName,
      margin: parseFloat(margin),
      batchNo,
      expiredDate: formatDate(expiredDate), // Mengubah tanggal ke ISO format
      supplierName
    }
  })
}
