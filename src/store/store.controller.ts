import { Request, Response } from 'express'
import multer from 'multer'
import { getStoreData, updateStore } from './store.service'
import { logger } from '../utils/logger'

export const updateStoreHandler = async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  const { storeName, address, phone } = req.body

  try {
    const logo = req.file ? req.file.buffer : undefined

    const updatedStore = await updateStore({ storeName, address, phone, logo })
    logger.info('Store data successfully updated')
    return res.status(200).send({ status: true, statusCode: 200, data: updatedStore })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`ERR: Store - update = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Store - update = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getStoreHandler = async (req: Request, res: Response) => {
  try {
    const store = await getStoreData()
    logger.info('success get Store data')
    return res.status(200).send({ status: true, statusCode: 200, data: store })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`ERR: Store - get = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Store - get = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}
