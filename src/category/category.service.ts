import { PrismaClient } from '@prisma/client'
import DrugType from '../drug/drug.type'
import CategoryType from './category.type'

const prisma = new PrismaClient()

export const createCategory = async (name: string) => {
  return await prisma.category.create({ data: { name } })
}

export const getCategories = async () => {
  return await prisma.category.findMany({
    select: {
      id: true,
      name: true
    }
  })
}

export const fetchCategoryByName = async (name: string) => {
  return await prisma.category.findUnique({
    where: { name }
  })
}

export const deleteCategory = async (id: string) => {
  return prisma.category.delete({
    where: {
      id
    }
  })
}

export const updateCategory = async (id: string, data: Partial<CategoryType>) => {
  // Find the existing category
  const existingCategory = await prisma.category.findUnique({ where: { id } })
  if (!existingCategory) {
    throw new Error('Category not found')
  }

  // Update the category name
  const updatedCategory = await prisma.category.update({
    where: { id },
    data
  })

  // Update the category name in all related Drug records
  const drugsWithCategory = await prisma.drug.findMany({
    where: {
      category: data.name
    }
  })

  // for (const drug of drugsWithCategory) {
  //   const updatedCategories = drug.categories.map((category) => (category.id === id ? updatedCategory : category))

  //   await prisma.drug.update({
  //     where: { id: drug.id },
  //     data: {
  //       categories: {
  //         set: updatedCategories.map((category) => ({ id: category.id }))
  //       }
  //     }
  //   })
  // }

  return updatedCategory
}
