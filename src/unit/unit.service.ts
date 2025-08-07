import { Prisma, PrismaClient } from '@prisma/client'
import UnitType from './unit.type'

const prisma = new PrismaClient()

interface PaginationParams {
  page: number
  limit: number
  search?: string
}

export const createUnit = async (name: string) => {
  return await prisma.unit.create({
    data: {
      name
    }
  })
}

export const fetchUnit = async () => {
  return await prisma.unit.findMany()
}

export const fetchUnitByName = async (unitName: string) => {
  return await prisma.unit.findUnique({
    where: {
      name: unitName
    },
    select: {
      id: true,
      name: true
    }
  })
}

export const deleteUnit = async (id: string) => {
  return prisma.unit.delete({
    where: {
      id
    }
  })
}

export const getUnitPagination = async ({ page, limit, search }: PaginationParams) => {
  const skip = (page - 1) * limit
  const take = limit
  const where = search
    ? {
        name: {
          contains: search,
          mode: Prisma.QueryMode.insensitive
        }
      }
    : {}

  try {
    const [units, total] = await prisma.$transaction([
      prisma.unit.findMany({
        skip,
        take,
        where,
        select: {
          id: true,
          name: true
        }
      }),
      prisma.unit.count({ where })
    ])

    return {
      units,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  } catch (error) {}
}

export const updateUnit = async (id: string, data: Partial<UnitType>) => {
  // Find the existing unit
  const existingUnit = await prisma.unit.findUnique({ where: { id } })
  if (!existingUnit) {
    throw new Error('Unit not found')
  }

  // Update the unit name
  const updatedUnit = await prisma.unit.update({
    where: { id },
    data
  })

  // Update the unitName field in all related Drug records
  await prisma.drug.updateMany({
    where: { unitName: existingUnit.name },
    data: { unitName: data.name }
  })

  return updatedUnit
}
