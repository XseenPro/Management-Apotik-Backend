import multer from 'multer'
import { Router } from 'express'
import {
  addDrug,
  addDrugsFromFileHandler,
  deleteDrugById,
  getAlmostExpiredDrugsHandler,
  getDrug,
  getDrugStatisticsHandler,
  getDrugWithPageFilter,
  getExpiredDrug,
  getOutOfStockDrug,
  updateDrugHandler
} from './drug.controller'
import { requireUser, verifyToken } from '../middlewares/authorization'

export const DrugRouter: Router = Router()

DrugRouter.post('/', verifyToken, addDrug)
DrugRouter.get('/', verifyToken, getDrugWithPageFilter)
DrugRouter.get('/all', verifyToken, getDrug)
DrugRouter.get('/almost-expired', verifyToken, getAlmostExpiredDrugsHandler)
DrugRouter.get('/expired', verifyToken, getExpiredDrug)
DrugRouter.get('/out-of-stock', verifyToken, getOutOfStockDrug)
DrugRouter.get('/drug-statistics', verifyToken, getDrugStatisticsHandler)
DrugRouter.get('/:id', verifyToken, getDrug)
DrugRouter.put('/:id', verifyToken, updateDrugHandler)
DrugRouter.delete('/:id', verifyToken, deleteDrugById)

const upload = multer({ storage: multer.memoryStorage() })

DrugRouter.post('/upload-drugs', upload.single('file'), addDrugsFromFileHandler)
