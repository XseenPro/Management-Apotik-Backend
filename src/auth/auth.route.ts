import { Router } from 'express'
import { createSession, registerUser, sendResetPasswordEmail, resetPassword } from './auth.controller'

export const AuthRouter: Router = Router()

AuthRouter.post('/register', registerUser)
AuthRouter.post('/login', createSession)
AuthRouter.post('/request-password-reset', sendResetPasswordEmail)
AuthRouter.post('/reset-password', resetPassword)
