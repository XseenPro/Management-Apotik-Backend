import { Router } from 'express'
import { getDashboardStatisticsHandler } from './dashboard.controller'
import { requireUser, verifyToken } from '../middlewares/authorization'

export const DashboardRouter: Router = Router()

DashboardRouter.get('/overview', verifyToken, getDashboardStatisticsHandler)
