import { Router } from 'express'
import { addCategory, deleteCategoryById, editCategory, getCategory } from './category.controller'
import { requireUser, verifyToken } from '../middlewares/authorization'

export const CategoryRouter: Router = Router()

CategoryRouter.get('/', verifyToken, getCategory)
CategoryRouter.post('/', verifyToken, addCategory)
CategoryRouter.put('/:id', verifyToken, editCategory)
CategoryRouter.delete('/:id', verifyToken, deleteCategoryById)
