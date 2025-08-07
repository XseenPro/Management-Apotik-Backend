import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import DrugType from './drug.type'
import { fetchCategoryByName } from '../category/category.service'
import { fetchUnitByName } from '../unit/unit.service'
import { fetchSupplierByName } from '../supplier/supplier.service'
import {
  addDrugsFromFileService,
  createDrug,
  deleteDrug,
  fetchAllDrug,
  fetchAlmostExpiredDrugs,
  fetchDrugById,
  fetchExpiredDrug,
  fetchOutOfStockDrug,
  getDrugStatistics,
  getDrugsWithFilters,
  parseCSV,
  parseExcel,
  updateDrug
} from './drug.service'
import { Prisma } from '@prisma/client'

export const addDrug = async (req: Request, res: Response) => {
  try {
    const drug: DrugType = req.body

    // Find category by name
    const category = await fetchCategoryByName(drug.category)

    if (!category) {
      throw new Error('Category Invalid')
    }

    const unit = await fetchUnitByName(drug.unitName)
    if (!unit) {
      throw new Error(`Unit with name ${drug.unitName} not found`)
    }

    const supplier = await fetchSupplierByName(drug.supplierName)
    if (!supplier) {
      throw new Error(`Supplier with name ${drug.supplierName} not found`)
    }
    await createDrug(drug)

    logger.info('Success add new Drug')
    return res.status(201).send({ status: true, statusCode: 201, message: 'Add new drug success' })
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

export const getDrug = async (req: Request, res: Response) => {
  const {
    params: { id }
  } = req
  try {
    if (id) {
      const drug = await fetchDrugById(id)
      if (drug) {
        logger.info('Successs get drug data')
        return res.status(200).send({ status: true, statusCode: 200, data: drug })
      } else {
        return res.status(404).send({ status: false, statusCode: 404, message: 'Drug Data Not Found', data: {} })
      }
    }
    const drugs = await fetchAllDrug()
    if (drugs.length === 0) {
      logger.info('No Drug Available')
      return res.status(200).send({ status: true, statusCode: 200, message: 'No Drug Available', data: drugs })
    }
    logger.info('Success get all drug')
    return res.status(200).send({ status: true, statusCode: 200, data: drugs })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: drug - get = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: drug - get = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getExpiredDrug = async (req: Request, res: Response) => {
  try {
    const expiredDrugs = await fetchExpiredDrug()
    if (expiredDrugs.length === 0) {
      logger.info('No Expired Drug')
      return res.status(200).send({ status: true, statusCode: 200, message: 'No Expired Drug', data: expiredDrugs })
    }
    logger.info('Success get all expired drug')
    return res.status(200).send({ status: true, statusCode: 200, data: expiredDrugs })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: expired drug - get = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: expired drug - get = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getOutOfStockDrug = async (req: Request, res: Response) => {
  try {
    const outOfStockDrug = await fetchOutOfStockDrug()
    if (outOfStockDrug.length === 0) {
      logger.info('No Out Of Stock Drug')
      return res
        .status(200)
        .send({ status: true, statusCode: 200, message: 'No Out Of Stock Drug', data: outOfStockDrug })
    }
    logger.info('Success get Out Of Stock drug')
    return res.status(200).send({ status: true, statusCode: 200, data: outOfStockDrug })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: Out Of Stock drug - get = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: Out Of Stock drug - get = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getDrugWithPageFilter = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, name, category, unit } = req.query
    const filters = {
      page: Number(page),
      limit: Number(limit),
      name: name as string,
      categoryName: category as string,
      unitName: unit as string
    }

    const drugs = await getDrugsWithFilters(filters)
    logger.info('Success get all pagination drugs')
    return res.status(200).send({ status: true, statusCode: 200, data: drugs })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: pagination drug - get = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: pagination drug - get = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const deleteDrugById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const drug = await deleteDrug(id)
    logger.info(`Drug with id ${id} deleted successfully`)
    return res.status(200).json({ status: true, statusCode: 200, message: 'Drug deleted successfully', data: drug })
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
      logger.error(`ERR: drug - delete = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: drug - delete = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getAlmostExpiredDrugsHandler = async (req: Request, res: Response) => {
  try {
    const { limit = 5 } = req.query
    const expiredDrugs = await fetchAlmostExpiredDrugs(Number(limit))
    logger.info('Success get almost expired drugs')
    return res.status(200).send({ status: true, statusCode: 200, data: expiredDrugs })
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
      logger.error(`ERR: expired drugs - get = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: expired drugs - get = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const updateDrugHandler = async (req: Request, res: Response) => {
  try {
    const drugId = req.params.id
    const updateData = req.body
    const updatedDrug = await updateDrug(drugId, updateData)
    logger.info(`Drug with ID ${drugId} updated successfully`)
    return res.status(200).json({
      status: true,
      statusCode: 200,
      data: updatedDrug
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
      logger.error(`ERR: drug - update = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: drug - update = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const getDrugStatisticsHandler = async (req: Request, res: Response) => {
  try {
    const statistics = await getDrugStatistics()
    return res.status(200).send({ status: true, statusCode: 200, data: statistics })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`ERR: drug - get statistics = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      console.error(`ERR: drug - get statistics = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const addDrugsFromFileHandler = async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    const file = req.file

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    // Check if the file is CSV or Excel and parse accordingly
    let parsedData: any[] = []
    const mimeType = file.mimetype
    let typeFile

    if (mimeType === 'text/csv') {
      parsedData = await parseCSV(file.buffer)
      typeFile = 'csv'
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      parsedData = parseExcel(file.buffer)
      typeFile = 'excel'
    } else {
      return res.status(400).json({ message: 'Unsupported file type' })
    }

    logger.info(`Success Import data from ${typeFile}`)

    // Call service to process and add drugs to database
    const addedDrugs = await addDrugsFromFileService(parsedData)

    return res.status(201).json({ status: true, statusCode: 201, data: addedDrugs })
  } catch (error) {
    return res.status(500).json({ message: error })
  }
}
