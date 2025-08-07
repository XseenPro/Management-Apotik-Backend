import { Request, Response } from 'express'
import {
  createPurchase,
  deletePurchase,
  getAllPurchases,
  getLastInvoice,
  getPurchaseById,
  getPurchaseGraphData,
  getPurchaseOverview,
  getRecentPurchases,
  updatePurchase
} from './purchase.service'
import { logger } from '../utils/logger'
import { Prisma } from '@prisma/client'

export const createPurchaseHandler = async (req: Request, res: Response) => {
  try {
    const { date, supplier, status, purchaseItems, invoice, totalPrice } = req.body
    const username = res.locals.user.username
    // Validate request body
    if (!date || !supplier || !status || !purchaseItems || !invoice) {
      return res.status(400).send({ status: false, statusCode: 400, message: 'All fields are required' })
    }

    const newPurchase = await createPurchase({
      date,
      supplier,
      status,
      purchaseItems,
      invoice,
      username
    })
    logger.info('Purchase created successfully')
    return res.status(201).send({ status: true, statusCode: 201, data: newPurchase })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Error code for unique constraint violation
      if (error.code === 'P2002') {
        const meta = error.meta as { target: string[] }
        const uniqueField = meta.target[0]
        logger.error(`ERR: Purchase create = Unique constraint failed on the fields: (${uniqueField})`)
        return res
          .status(422)
          .send({ status: false, statusCode: 422, message: `Unique constraint failed on the fields: (${uniqueField})` })
      }
    } else if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: Purchase - create = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Purchase - create = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const updatePurchaseHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { date, supplier, status, purchaseItems } = req.body

    if (!id) {
      return res.status(400).send({ status: false, statusCode: 400, message: 'Missing ' })
    }

    const updatedPurchase = await updatePurchase({ id, date, supplier, status, purchaseItems })
    logger.info('Success update Purchase')

    return res.status(200).send({ status: true, statusCode: 200, data: updatedPurchase })
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
      logger.error(`ERR: Purchase - update = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Purchase - update = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}
export const getAllPurchasesHandler = async (req: Request, res: Response) => {
  try {
    const { date, status } = req.query

    const purchases = await getAllPurchases({
      date: date ? new Date(date as string) : undefined,
      status: status as string
    })
    logger.info('Success get all purchase')
    return res.status(200).send({ status: true, statusCode: 200, data: purchases })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`ERR: Purchase - getAll = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Purchase - getAll = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getRecentPurchasesHandler = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 3

    if (isNaN(limit) || limit < 1) {
      return res.status(400).send({ status: false, statusCode: 400, message: 'Invalid limit value' })
    }

    const recentPurchases = await getRecentPurchases(limit)

    return res.status(200).send({ status: true, statusCode: 200, data: recentPurchases })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`ERR: Purchase - get Recent = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Purchase - get Recent = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getPurchaseGraphDataHandler = async (req: Request, res: Response) => {
  try {
    const stats = await getPurchaseGraphData()

    return res.status(200).send({ status: true, statusCode: 200, data: stats })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`ERR: Purchase - get Graph Data = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Purchase - get Graph Data = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getPurchaseOverviewHandler = async (req: Request, res: Response) => {
  try {
    const overview = await getPurchaseOverview()

    return res.status(200).send({ status: true, statusCode: 200, data: overview })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`ERR: Purchase - get Overview = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Purchase - get Overview = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const deletePurchaseHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).send({ status: false, statusCode: 400, message: 'Missing purchaseId' })
    }

    const result = await deletePurchase(id)

    return res.status(200).send({ status: true, statusCode: 200, data: result })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`ERR: Purchase - delete = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Purchase - delete = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getLastInvoiceHandler = async (req: Request, res: Response) => {
  try {
    const { date } = req.query
    const { lastInvoice, nextInvoice } = await getLastInvoice(new Date(date as string))
    if (lastInvoice) {
      logger.info(`Success Get last invoice for today: ${lastInvoice}`)
    } else {
      logger.info('No invoices found for today')
    }
    return res.status(200).send({ status: true, statusCode: 200, data: { lastInvoice, nextInvoice } })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: Purchase - get last invoice = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Purchase - get last invoice = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getPurchaseByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const purchase = await getPurchaseById(id)
    logger.info(`Success Get Purchase with id ${id}`)
    return res.status(200).send({ status: true, statusCode: 200, data: purchase })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: Purchase - get by Id = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Purchase - get by Id = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}
