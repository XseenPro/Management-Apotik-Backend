import { Router } from 'express'
import { requireUser, verifyToken } from '../middlewares/authorization'
import { addUnit, deleteUnitById, editUnit, getUnits, searchUnit } from './unit.controller'

export const UnitRouter: Router = Router()

UnitRouter.get('/', verifyToken, searchUnit)
UnitRouter.get('/all', verifyToken, getUnits)
UnitRouter.post('/', verifyToken, addUnit)
UnitRouter.put('/:id', verifyToken, editUnit)
UnitRouter.delete('/:id', verifyToken, deleteUnitById)
