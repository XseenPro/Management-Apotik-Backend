import { Router } from 'express'
import {
  calculateNetIncomeController,
  generateFinancialReportController,
  getCurrentMonthRecapController,
  getRevenueAndCOGS
} from './report.controller'
import { requireUser, verifyToken } from '../middlewares/authorization'

export const ReportRouter: Router = Router()

ReportRouter.get('/current-month', verifyToken, getCurrentMonthRecapController)
ReportRouter.get('/revenue-and-cogs', verifyToken, getRevenueAndCOGS)
ReportRouter.post('/net-income-calculation', verifyToken, calculateNetIncomeController)
ReportRouter.get('/financial-report', verifyToken, generateFinancialReportController)
