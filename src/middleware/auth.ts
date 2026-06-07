const debug = require('debug')('middleware:auth')
import { NextFunction, Request, Response } from 'express'
import jwt, { JsonWebTokenError } from 'jsonwebtoken'
import { UserRole } from 'models/user'

export type Payload = { 
  id: string,
  name: string,
  role: UserRole
}

/**
 * Verififes a JWT.
 * @param token - The JWT to verify.
 * @returns The decoded user information if the token is valid, or null if invalid.
 */
const verifyToken = (token: string) => {
  let user: Payload | null = null
  if (token) {
    try {
      debug('verifying user token')
      user = jwt.verify(token, process.env.JWT_SECRET as string) as Payload
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

/**
 * Configuration options for the auth middleware.
 */
export interface AuthOptions {
  /**
   * List of user roles that are allowed to access the route.
   */
  allowedRoles: UserRole[]
}

/**
 * Middleware to authenticate requests using a JWT. The token should be provided in the `x-auth-token` header.
 * If the token is valid and the user's role is included in the allowed roles, the user information will be attached
 * to the request object as `req.user`.
 * If the token is missing, invalid, or the user's role is not allowed, an appropriate HTTP status code (401 or 403)
 * will be returned.
 * 
 * @param options - Auth configuration options object.
 * @returns An Express middleware function that performs authentication and authorization.
 */
export default function(options: AuthOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.header('x-auth-token')
    debug('authenticating user')
    if (!token) {
      debug('no token provided')
      return res.status(401).end()
    }
    const user = verifyToken(token)
    if (!user) {
      debug('authentication failed: invalid token')
      return res.status(401).end()
    } else if (!options.allowedRoles.includes(user.role)) {
      debug(`user ${user.id} not authorized to access route}`)
      return res.status(403).end()
    } else {
      debug('authentication successful')
      req.user = user
      return next()
    }
  }
}
