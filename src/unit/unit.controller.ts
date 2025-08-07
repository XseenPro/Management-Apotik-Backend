import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { createUnit, deleteUnit, fetchUnit, getUnitPagination, updateUnit } from './unit.service'
import { Prisma } from '@prisma/client'

export const addUnit = async (req: Request, res: Response) => {
  const { name } = req.body
  try {
    const supplier = await createUnit(name)
    logger.info('Success add new unit')
    return res.status(201).send({ status: true, statusCode: 201, message: 'Add new unit success' })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Error code for unique constraint violation
      if (error.code === 'P2002') {
        const meta = error.meta as { target: string[] }
        const uniqueField = meta.target[0]
        logger.error(`ERR: unit - create = Unique constraint failed on the fields: (${uniqueField})`)
        return res
          .status(422)
          .send({ status: false, statusCode: 422, message: `Unique constraint failed on the fields: (${uniqueField})` })
      }
    } else if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: unit - create = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: unit - create = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getUnits = async (req: Request, res: Response) => {
  try {
    const suppliers = await fetchUnit()
    logger.info('Success get all units')
    return res.status(200).send({ status: true, statusCode: 200, data: suppliers })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: unit - get = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: unit - get = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const deleteUnitById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const unit = await deleteUnit(id)
    logger.info(`Unit with id ${id} deleted successfully`)
    return res.status(200).json({ status: true, statusCode: 200, message: 'Unit deleted successfully', data: unit })
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
      logger.error(`ERR: unit - delete = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: unit - delete = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const searchUnit = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query

    const units = await getUnitPagination({
      page: Number(page),
      limit: Number(limit),
      search: String(search)
    })

    logger.info('Success search units')
    return res.status(200).send({ status: true, statusCode: 200, data: units })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: unit - search pagination = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: unit - search pagination = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const editUnit = async (req: Request, res: Response) => {
  const { id } = req.params
  const { name } = req.body

  if (!name) {
    return res.status(400).json({
      status: false,
      statusCode: 400,
      message: 'Unit name is required'
    })
  }

  try {
    const updatedUnit = await updateUnit(id, { name })
    return res.status(200).json({
      status: true,
      statusCode: 200,
      message: 'Unit updated successfully',
      data: updatedUnit
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
      logger.error(`ERR: unit - update = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: unit - update = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}
