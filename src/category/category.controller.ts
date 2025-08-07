import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { createCategory, deleteCategory, getCategories, updateCategory } from './category.service'
import { Prisma } from '@prisma/client'

export const addCategory = async (req: Request, res: Response) => {
  const { name } = req.body
  try {
    const category = await createCategory(name)
    logger.info('Success add new Category')
    return res.status(201).send({ status: true, statusCode: 201, message: 'Add new category success' })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Error code for unique constraint violation
      if (error.code === 'P2002') {
        const meta = error.meta as { target: string[] }
        const uniqueField = meta.target[0]
        logger.error(`ERR: category - create = Unique constraint failed on the fields: (${uniqueField})`)
        return res
          .status(422)
          .send({ status: false, statusCode: 422, message: `Unique constraint failed on the fields: (${uniqueField})` })
      }
    } else if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: category - create = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: category - create = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getCategory = async (req: Request, res: Response) => {
  try {
    const categories = await getCategories()
    logger.info('Success get all categories')
    return res.status(200).send({ status: true, statusCode: 200, data: categories })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: category - get = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: category - get = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const deleteCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const category = await deleteCategory(id)
    logger.info(`Category with id ${id} deleted successfully`)
    return res
      .status(200)
      .json({ status: true, statusCode: 200, message: 'Category deleted successfully', data: category })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        const meta = error.meta as { modelName: string }
        return res.status(404).send({
          status: false,
          statusCode: 404,
          message: `The specified ${meta.modelName} to delete does not exist`
        })
      }
    } else if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: Category - delete = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Category - delete = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const editCategory = async (req: Request, res: Response) => {
  const { id } = req.params
  const { name } = req.body

  if (!name) {
    return res.status(400).json({
      status: false,
      statusCode: 400,
      message: 'Category name is required'
    })
  }

  try {
    const updatedCategory = await updateCategory(id, { name })
    return res.status(200).json({
      status: true,
      statusCode: 200,
      message: 'Category updated successfully',
      data: updatedCategory
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        const meta = error.meta as { modelName: string }
        return res.status(404).send({
          status: false,
          statusCode: 404,
          message: `The specified ${meta.modelName} to update does not exist`
        })
      }
    } else if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: category - update = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: category - update = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}
