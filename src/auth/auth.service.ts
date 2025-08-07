import { PrismaClient, User } from '@prisma/client'
import UserType from './user.type'

const prisma = new PrismaClient()

export const createUser = async (payload: UserType) => {
  return await prisma.user.create({
    data: {
      username: payload.username,
      password: payload.password,
      email: payload.email
    }
  })
}

export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: {
      email
    }
  })
}

export const updateResetPassToken = async (email: string, token: string, resetTokenExpiry: Date) => {
  return prisma.user.update({
    where: { email },
    data: {
      resetPasswordToken: token,
      resetPasswordExpires: resetTokenExpiry
    }
  })
}

export const findUserByResetPassToken = async (token: string) => {
  return prisma.user.findFirst({
    where: { resetPasswordToken: token }
  })
}

export const updatePassword = async (userId: string, hashedPassword: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null
    }
  })
}
