import { Request, Response } from 'express'
import {
  createSaleService,
  deleteSale,
  generateDetailSale,
  getAllSales,
  getLastInvoice,
  getRecentSales,
  getSaleById,
  getSalesData,
  getSalesDataRevenueProfit,
  getSalesProfit,
  getTotalIncomeAndSales,
  updateSale
} from './sale.service'
import { logger } from '../utils/logger'
import { Prisma } from '@prisma/client'

export const createSale = async (req: Request, res: Response) => {
  try {
    const saleData = req.body
    saleData.username = res.locals.user.username
    const newSale = await createSaleService(saleData)
    logger.info('Sale created successfully')
    return res.status(201).json({ status: true, statusCode: 201, data: newSale })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Error code for unique constraint violation
      if (error.code === 'P2002') {
        const meta = error.meta as { target: string[] }
        const uniqueField = meta.target[0]
        logger.error(`ERR: drug create = Unique constraint failed on the fields: (${uniqueField})`)
        return res
          .status(422)
          .send({ status: false, statusCode: 422, message: `Unique constraint failed on the fields: (${uniqueField})` })
      }
    } else if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: drug - create = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: drug - create = ${error}`)
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
      logger.error(`ERR: Sale - get last invoice = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Sale - get last invoice = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getTotalIncomeAndSalesController = async (req: Request, res: Response) => {
  try {
    const result = await getTotalIncomeAndSales()
    logger.info(
      `Total Sales: ${result.totalSales}, Total Income: ${result.totalIncome}, Total Profit: ${result.totalProfit}, Profit Bulan ini: ${result.thisMonthProfit}`
    )
    return res.status(200).send({ status: true, statusCode: 200, data: result })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: Sale - get total income and sales = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Sale - get total income and sales = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getSalesDataController = async (req: Request, res: Response) => {
  try {
    const result = await getSalesDataRevenueProfit()
    // const result = await getSalesData()
    logger.info('Success get sales data')
    return res.status(200).send({ status: true, statusCode: 200, data: result })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: Sale - get graph sales data = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Sale - get graph sales data = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getRecentSalesController = async (req: Request, res: Response) => {
  try {
    const { limit } = req.query
    if (!limit) {
      const result = await getRecentSales({})
      logger.info('Success get recent sales')
      return res.status(200).send({ status: true, statusCode: 200, data: result })
    }
    const result = await getRecentSales({ limit: Number(limit) })
    logger.info('Success get recent sales')
    return res.status(200).send({ status: true, statusCode: 200, data: result })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: Sale - get recent sales = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Sale - get recent sales = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getAllSalesController = async (req: Request, res: Response) => {
  try {
    const { date } = req.query
    const result = await getAllSales({ date: date as string })
    logger.info('Success get all sales')
    return res.status(200).send({ status: true, statusCode: 200, data: result })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: Sale - get all with date search = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Sale - get all with date search = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getSaleByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const sale = await getSaleById(id)
    logger.info(`Success Get Sale with id ${id}`)
    return res.status(200).send({ status: true, statusCode: 200, data: sale })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: Sale - get by Id = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Sale - get by Id = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const deleteSaleController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await deleteSale(id)
    logger.info(`Sale with id ${id} deleted successfully`)
    return res.status(200).send({ status: true, statusCode: 200, data: result })
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
      logger.error(`ERR: sale - delete = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: sale - delete = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const updateSaleController = async (req: Request, res: Response) => {
  const { id } = req.params
  const { date, invoice, saleItems } = req.body

  try {
    const username = res.locals.user.username
    const updatedSale = await updateSale({
      id,
      date: date ? new Date(date) : undefined,
      invoice,
      username,
      saleItems
    })

    logger.info('Sale updated successfully')
    return res.status(200).json({ status: true, statusCode: 200, data: updatedSale })
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
      logger.error(`ERR: sale - update = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: sale - update = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getSalesProfitController = async (req: Request, res: Response) => {
  try {
    const salesProfit = await getSalesProfit()
    return res.status(200).send({
      status: true,
      statusCode: 200,
      data: salesProfit
    })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`ERR: Sales - getSalesProfit = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Sales - getSalesProfit = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getSaleDetailPDF = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const sale = await generateDetailSale(id)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=SaleDetail~${sale.invoice}.pdf`)
    res.send(sale.saleDetailPDF)
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`ERR: Sales - getSalesProfit = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Sales - getSalesProfit = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}
