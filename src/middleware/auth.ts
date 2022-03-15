const debug = require('debug')('middleware:auth')
import jwt, { JsonWebTokenError } from 'jsonwebtoken'

const verifyToken = (token: string) => {
  let user = null
  if (token) {
    try {
      debug('verifying user token')
      const payload: any = jwt.verify(token, process.env.JWT_SECRET as string)
      user = payload.user
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        debug('verify jwt error: ', error.message)
      } else {
        debug('unknown error: ', error)
      }
    }
  }

  return user
}

export interface AuthOptions {
  required: boolean
}

export default function(options: AuthOptions) {
  return async (req: any, res: any, next: any) => {
    const token = req.header('x-auth-token')
    debug('authenticating user')
    const user = verifyToken(token)
    debug(user ? `user token received: ${user.id}` : 'no user token')
    if (!user && options.required) {
      res.status(401).end()
    } else {
      req.user = user
      return next()
    }
  }
}
