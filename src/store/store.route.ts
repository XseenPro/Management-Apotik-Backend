import express, { Router } from 'express'
import multer from 'multer'
import { getStoreHandler, updateStoreHandler } from './store.controller'
import { requireUser, verifyToken } from '../middlewares/authorization'

const upload = multer()

export const StoreRouter: Router = express.Router()

StoreRouter.put('/', verifyToken, upload.single('logo'), updateStoreHandler)
StoreRouter.get('/', verifyToken, getStoreHandler)
