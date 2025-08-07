import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { verifyJWT } from '../utils/jwt'

type VerifyJWTResult = {
  valid: boolean
  expired: boolean
  decoded: string | jwt.JwtPayload | null
}

const deserializeToken = async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.headers.authorization?.replace(/^Bearer\s/, '')
  if (!accessToken) {
    return next()
  }

  const token: VerifyJWTResult = verifyJWT(accessToken)
  if (token.decoded) {
    res.locals.user = token.decoded
    return next()
  }

  if (token.expired) {
    return next()
  }

  return next()
}

export default deserializeToken
