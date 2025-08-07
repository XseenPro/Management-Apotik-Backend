import { Router } from 'express'
import {
  createSale,
  deleteSaleController,
  getAllSalesController,
  getLastInvoiceHandler,
  getRecentSalesController,
  getSaleByIdController,
  getSaleDetailPDF,
  getSalesDataController,
  getSalesProfitController,
  getTotalIncomeAndSalesController,
  updateSaleController
} from './sale.controller'
import { requireUser, verifyToken } from '../middlewares/authorization'

export const SaleRouter: Router = Router()

SaleRouter.post('/', verifyToken, createSale)
SaleRouter.get('/last-invoice', verifyToken, getLastInvoiceHandler)
SaleRouter.get('/sale-statistics', verifyToken, getTotalIncomeAndSalesController)
SaleRouter.get('/sales-data', verifyToken, getSalesDataController)
SaleRouter.get('/recent-sales', verifyToken, getRecentSalesController)
SaleRouter.get('/all-sales', verifyToken, getAllSalesController)
SaleRouter.get('/sales-profit', verifyToken, getSalesProfitController)
SaleRouter.get('/detail-sale/:id', verifyToken, getSaleDetailPDF)
SaleRouter.get('/:id', verifyToken, getSaleByIdController)
SaleRouter.put('/:id', verifyToken, updateSaleController)
SaleRouter.delete('/:id', verifyToken, deleteSaleController)
