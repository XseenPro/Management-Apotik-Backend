import { PrismaClient } from '@prisma/client'
import SupplierType from './supplier.type'

const prisma = new PrismaClient()

export const createSupplier = async (data: SupplierType) => {
  return await prisma.supplier.create({ data })
}

export const fetchSupplier = async () => {
  return await prisma.supplier.findMany()
}

export const fetchSupplierById = async (id: string) => {
  return await prisma.supplier.findUnique({
    where: {
      id
    }
  })
}

export const fetchSupplierByName = async (supplierName: string) => {
  return await prisma.supplier.findUnique({
    where: {
      name: supplierName
    },
    select: {
      id: true,
      name: true
    }
  })
}

export const deleteSupplier = async (id: string) => {
  return prisma.supplier.delete({
    where: {
      id
    }
  })
}

export const updateSupplier = async (id: string, data: Partial<SupplierType>) => {
  const updatedSupplier = await prisma.supplier.update({
    where: { id },
    data
  })
  return updatedSupplier
}
