import { Router } from 'express'
import { requireUser, verifyToken } from '../middlewares/authorization'
import {
  createPurchaseHandler,
  deletePurchaseHandler,
  getAllPurchasesHandler,
  getLastInvoiceHandler,
  getPurchaseByIdHandler,
  getPurchaseGraphDataHandler,
  getPurchaseOverviewHandler,
  getRecentPurchasesHandler,
  updatePurchaseHandler
} from './purchase.controller'

export const PurchaseRouter: Router = Router()

PurchaseRouter.post('/', verifyToken, createPurchaseHandler)
PurchaseRouter.get('/', verifyToken, getAllPurchasesHandler)
PurchaseRouter.get('/last-invoice', verifyToken, getLastInvoiceHandler)
PurchaseRouter.get('/recent-purchase', verifyToken, getRecentPurchasesHandler)
PurchaseRouter.get('/purchase-data', verifyToken, getPurchaseGraphDataHandler)
PurchaseRouter.get('/overview', verifyToken, getPurchaseOverviewHandler)
PurchaseRouter.get('/:id', verifyToken, getPurchaseByIdHandler)
PurchaseRouter.put('/:id', verifyToken, updatePurchaseHandler)
PurchaseRouter.delete('/:id', verifyToken, deletePurchaseHandler)
