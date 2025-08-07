import { Router } from 'express'
import { requireUser, verifyToken } from '../middlewares/authorization'
import { addSupplier, deleteSupplierById, editSupplier, getSuppliers } from './supplier.controller'

export const SupplierRouter: Router = Router()

SupplierRouter.get('/', verifyToken, getSuppliers)
SupplierRouter.get('/:id', verifyToken, getSuppliers)
SupplierRouter.post('/', verifyToken, addSupplier)
SupplierRouter.put('/:id', verifyToken, editSupplier)
SupplierRouter.delete('/:id', verifyToken, deleteSupplierById)
