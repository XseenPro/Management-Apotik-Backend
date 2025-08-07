import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { createSupplier, deleteSupplier, fetchSupplier, fetchSupplierById, updateSupplier } from './supplier.service'
import SupplierType from './supplier.type'
import { Prisma } from '@prisma/client'

export const addSupplier = async (req: Request, res: Response) => {
  const supplierNew: SupplierType = req.body
  try {
    const supplier = await createSupplier(supplierNew)
    logger.info('Success add new supplier')
    return res.status(201).send({ status: true, statusCode: 201, message: 'Add new supplier success' })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Error code for unique constraint violation
      if (error.code === 'P2002') {
        const meta = error.meta as { target: string[] }
        const uniqueField = meta.target[0]
        logger.error(`ERR: supplier - create = Unique constraint failed on the fields: (${uniqueField})`)
        return res
          .status(422)
          .send({ status: false, statusCode: 422, message: `Unique constraint failed on the fields: (${uniqueField})` })
      }
    } else if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: supplier - create = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: supplier - create = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const {
      params: { id }
    } = req
    if (id) {
      const supplier = await fetchSupplierById(id)
      if (supplier) {
        logger.info('Successs get supplier data')
        return res.status(200).send({ status: true, statusCode: 200, data: supplier })
      } else {
        return res.status(404).send({ status: false, statusCode: 404, message: 'Supplier Data Not Found', data: {} })
      }
    }
    const suppliers = await fetchSupplier()
    if (suppliers.length === 0) {
      logger.info('No Supplier Available')
      return res.status(200).send({ status: true, statusCode: 200, message: 'No Supplier Available', data: suppliers })
    }
    logger.info('Success get all suppliers')
    return res.status(200).send({ status: true, statusCode: 200, data: suppliers })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: supplier - get = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: supplier - get = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const deleteSupplierById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const supplier = await deleteSupplier(id)
    logger.info(`Supplier with id ${id} deleted successfully`)
    return res
      .status(200)
      .json({ status: true, statusCode: 200, message: 'Supplier deleted successfully', data: supplier })
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
      logger.error(`ERR: Supplier - delete = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Supplier - delete = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const editSupplier = async (req: Request, res: Response) => {
  const { id } = req.params
  const { name, address, phone } = req.body

  try {
    const updatedSupplier = await updateSupplier(id, { name, address, phone })
    return res.status(200).json({
      status: true,
      statusCode: 200,
      message: 'Supplier updated successfully',
      data: updatedSupplier
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
      logger.error(`ERR: supplier - update = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: supplier - update = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}
