import { NextFunction, Request, Response } from 'express'
import jwt, { TokenExpiredError } from 'jsonwebtoken'
import { logger } from '../utils/logger'

export const requireUser = (req: Request, res: Response, next: NextFunction) => {
  const user = res.locals.user
  if (!user) {
    return res.status(403).send({ status: false, statusCode: 403, message: 'Forbidden' })
  }

  return next()
}

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.header('Authorization')

    if (!token) {
      return res.status(403).send('Access Denied')
    }

    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length).trimLeft()
    }

    // Pastikan bahwa JWT_SECRET ada sebelum melakukan verifikasi
    const secretKey = process.env.JWT_SECRET

    if (!secretKey) {
      return res.status(500).send({ status: false, statusCode: 500, message: 'JWT secret is not defined' })
    }

    const verified = jwt.verify(token, secretKey)
    res.locals.user = verified
    next()
  } catch (error) {
    if (error instanceof Error) {
      if (error instanceof TokenExpiredError) {
        logger.error(`ERR: ${error.message}`)
        return res.status(401).send({ status: false, statusCode: 401, message: 'Access token has expired' })
      }
      logger.error(`ERR: ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}
