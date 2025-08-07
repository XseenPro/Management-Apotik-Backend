import { Request, Response } from 'express'
import {
  getCurrentMonthRecap,
  getMonthlyRevenueAndCOGS,
  getNetIncomeEstimation,
  getPDFReport,
  getYearlyRevenueAndCOGS
} from './report.service'
import { logger } from '../utils/logger'

export const getCurrentMonthRecapController = async (req: Request, res: Response) => {
  try {
    const financials = await getCurrentMonthRecap()
    logger.info('Success get current month recap data: totalRevenue, totalCOGS, and totalGrossProfitLoss')
    return res.status(200).json({ status: true, statusCode: 200, data: financials })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message)
      return res.status(422).json({ status: false, statusCode: 422, message: error.message })
    }
    logger.error(error)
    return res.status(422).json({ status: false, statusCode: 422, message: 'An unexpected error occurred' })
  }
}
export const getRevenueAndCOGS = async (req: Request, res: Response) => {
  try {
    const monthlyData = await getMonthlyRevenueAndCOGS()
    const yearlyData = await getYearlyRevenueAndCOGS()

    logger.info('Success get monthly and annually revenue and COGS data')
    return res.status(200).send({
      status: true,
      statusCode: 200,
      data: {
        monthly: monthlyData,
        yearly: yearlyData
      }
    })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(error)
      return res.status(422).send({ status: false, statusCode: 422, message: 'An unknown error occurred' })
    }
  }
}

export const calculateNetIncomeController = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, operationCost, taxPercentage } = req.body

    if (!startDate || !endDate || operationCost === undefined || taxPercentage === undefined) {
      return res.status(400).send({
        status: false,
        statusCode: 400,
        message: 'Missing required fields: startDate, endDate, operationCost, taxPercentage'
      })
    }

    const data = await getNetIncomeEstimation({ startDate, endDate, operationCost, taxPercentage })
    logger.info('Success calculate net income estimation')
    return res.status(200).json({ status: true, statusCode: 200, data: data.result })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(error)
      return res.status(422).send({ status: false, statusCode: 422, message: 'An unknown error occurred' })
    }
  }
}

export const generateFinancialReportController = async (req: Request, res: Response) => {
  try {
    const data = await getPDFReport()

    // Send PDF as attachment
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename=net-income-estimation.pdf')
    logger.info('success generate Financial Report PDF')
    return res.status(200).send(data)
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      console.error(error)
      return res.status(422).send({ status: false, statusCode: 422, message: 'An unknown error occurred' })
    }
  }
}
