import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { checkPassword, hashing } from '../utils/hashing'
import {
  createUser,
  findUserByEmail,
  findUserByResetPassToken,
  updatePassword,
  updateResetPassToken
} from './auth.service'
import { signJWT } from '../utils/jwt'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'
import jwt from 'jsonwebtoken'

export const registerUser = async (req: Request, res: Response) => {
  const user = req.body
  try {
    user.password = `${hashing(user.password)}`

    await createUser(user)
    logger.info('Success register user')
    return res.status(201).json({ status: true, statusCode: 201, message: 'Success register user' })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Error code for unique constraint violation
      if (error.code === 'P2002') {
        const meta = error.meta as { target: string[] }
        const uniqueField = meta.target[0]
        logger.error(`ERR: auth - register = Unique constraint failed on the fields: (${uniqueField})`)
        return res
          .status(422)
          .send({ status: false, statusCode: 422, message: `Unique constraint failed on the fields: (${uniqueField})` })
      }
    } else if (error instanceof Error) {
      logger.error(`ERR: auth - register = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: auth - register = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const createSession = async (req: Request, res: Response) => {
  const userLogin = req.body
  try {
    const user = await findUserByEmail(userLogin.email)
    if (user === null) {
      return res.status(404).send({ status: false, statusCode: 422, message: 'Invalid Email' })
    }
    const isValid = checkPassword(userLogin.password, user.password)
    if (!isValid) return res.status(401).json({ status: false, statusCode: 401, message: 'Invalid Password' })

    // const accessToken = signJWT({ ...user }, { expiresIn: '1d' })
    const secretKey = process.env.JWT_SECRET

    if (!secretKey) {
      return res.status(500).json({ error: 'JWT secret is not defined' })
    }
    const accessToken = jwt.sign({ ...user }, secretKey, { expiresIn: '1d' })

    logger.info('Login Success')
    return res.status(200).send({
      status: true,
      statusCode: 200,
      message: 'Login success',
      data: { accessToken, user: { email: user.email, username: user.username } }
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`ERR: auth - create session = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: auth - create session = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

const saltRounds = 10

// Using app password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

export const sendResetPasswordEmail = async (req: Request, res: Response) => {
  try {
    // const transporter = await createTransporter()
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }
    const user = await findUserByEmail(email)

    if (!user) {
      throw new Error('User not found')
    }

    const token = crypto.randomBytes(20).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    await updateResetPassToken(email, token, resetTokenExpiry)

    const resetURL = `${process.env.FE_URL}/auth/reset-password/${token}`

    const mailOptions = {
      to: email,
      from: process.env.EMAIL_USER,
      subject: 'Password Reset',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
             Please click on the following link, or paste this into your browser to complete the process:\n\n
             ${resetURL}\n\n
             If you did not request this, please ignore this email and your password will remain unchanged.\n`
    }

    await transporter.sendMail(mailOptions)

    logger.info('Reset password email sent')
    return res.status(200).json({ status: true, statusCode: 200, message: 'Reset password email sent' })
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`ERR: auth - Send Reset Password = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: auth - Send Reset Password = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword, token } = req.body

    if (!email || !newPassword || !token) {
      return res.status(400).json({ error: 'Email, new password, and token are required' })
    }

    const user = await findUserByResetPassToken(token)

    if (!user) {
      throw new Error('User not found')
    }

    if (!user.resetPasswordExpires) {
      throw new Error('Password reset token not available')
    }

    if (!user || user.resetPasswordExpires < new Date()) {
      throw new Error('Password reset token is invalid or has expired')
    }

    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    const updatedUser = await updatePassword(user.id, hashedPassword)
    logger.info('Password has been reset')
    return res.status(200).json({ status: true, statusCode: 200, message: 'Password has been reset' })
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`ERR: auth - Reset Password = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message })
    } else {
      logger.error(`ERR: auth - Reset Password = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error })
    }
  }
}
