import express, { Application, Router } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { logger } from './utils/logger'
import { AuthRouter } from './auth/auth.route'
import deserializeToken from './middlewares/deserializedToken'
import { CategoryRouter } from './category/category.route'
import { SupplierRouter } from './supplier/supplier.route'
import { UnitRouter } from './unit/unit.route'
import { DrugRouter } from './drug/drug.route'
import { SaleRouter } from './sale/sale.route'
import { PurchaseRouter } from './purchase/purchase.route'
import { ReportRouter } from './report/report.route'
import { PrismaClient } from '@prisma/client'
import { StoreRouter } from './store/store.route'
import { DashboardRouter } from './dashboard/dashboard.route'

const app: Application = express()
const port: number = 4000
const prisma = new PrismaClient()
// parse body request
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// cors access handler
// app.use(cors())
// const feUrl = process.env.FE_URL
// if (!feUrl) {
//   throw new Error('Missing required URL environment variable')
// }
app.use(
  cors({
    origin: process.env.FE_URL,
    methods: 'GET,POST,PUT,DELETE',
    credentials: true
  })
)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  next()
})

// app.use(deserializeToken)

// Route Configuration
const _routes: [string, Router][] = [
  ['/auth', AuthRouter],
  ['/category', CategoryRouter],
  ['/supplier', SupplierRouter],
  ['/unit', UnitRouter],
  ['/drug', DrugRouter],
  ['/sale', SaleRouter],
  ['/purchase', PurchaseRouter],
  ['/report', ReportRouter],
  ['/store', StoreRouter],
  ['/dashboard', DashboardRouter]
]
_routes.forEach((route) => {
  const [url, router] = route
  app.use(url, router)
})
const initializeStore = async () => {
  try {
    const storeCount = await prisma.store.count()

    if (storeCount === 0) {
      await prisma.store.create({
        data: {
          storeName: 'ApotekHub',
          address: '',
          phone: '',
          logo: null
        }
      })
      logger.info('Store initialized with default data')
    } else {
      logger.info('Store data already exists')
    }
  } catch (error) {
    logger.error('Error initializing store:', error)
  }
}

initializeStore()
  .then(() => {
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`)
    })
  })
  .catch((error) => {
    logger.error('Failed to initialize store:', error)
    process.exit(1)
  })
