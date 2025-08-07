import { Request, Response } from 'express'
import { getDashboardStatistics } from './dashboard.service'
import { logger } from '../utils/logger'

export const getDashboardStatisticsHandler = async (req: Request, res: Response) => {
  try {
    const result = await getDashboardStatistics()
    return res.status(200).send({ status: true, statusCode: 200, data: result })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`ERR: dashboard - get overview = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      console.error(`ERR: dashboard - get overview = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}
