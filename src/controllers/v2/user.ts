import { NextFunction, Request, Response } from 'express'
import { check, query } from 'express-validator'

import authenticate from 'middleware/auth'
import resolveErrors from 'middleware/validation/resolve-errors-v2'
import * as validators from 'middleware/validation/user'

import { Controller, Delete, Get, Inject, Post, Put } from 'express-di'

import { QuizType } from 'models/quiz'
import { ResultType } from 'models/result'
import QuizService from 'services/v2/quiz'
import ResultService from 'services/v2/result'
import UserService from 'services/v2/user'

@Inject
export default class UserControllerV2 extends Controller({
  root: '/api/v2/users',
}) {
  constructor(
    private quizService: QuizService,
    private resultService: ResultService,
    private userService: UserService
  ) {
    super()
  }

  /**
   * Returns an authenticated user's info without sensitive info.
   */
  @Get('/me', [authenticate({ required: true })])
  async getUserData(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.userService.getUserById(req.user.id)
      if (!user) {
        res.status(401).end()
        return next()
      }
      res.json(user)
    } catch (error) {
      return next(error)
    }
    return next()
  }

  /**
   * Returns the request user's quizzes as either listing or full data.
   * By default, returns full format if no query string supplied.
   */
  @Get('/me/quizzes', [
    authenticate({ required: true }),
    query('format', 'Valid formats: listing, full')
      .custom((format) => format === 'listing' || format === 'full')
      .optional(),
    resolveErrors,
  ])
  async getUsersQuizzes(req: Request, res: Response, next: NextFunction) {
    const { format } = req.query
    const { id: userId } = req.user
    try {
      let quizzes: QuizType<'full'>[] | QuizType<'listing'>[] // list must be all same type
      if (!format || format === 'full') {
        quizzes = await this.quizService.getFullQuizzesByUser(userId)
      } else {
        quizzes = await this.quizService.getQuizzesByUserAsListing(userId)
      }
      res.json(quizzes)
    } catch (error) {
      return next(error)
    }
    return next()
  }

  /**
   * Returns the user's results for all quizzes as listing or full format.
   */
  @Get('/me/results', [
    authenticate({ required: true }),
    query('format', 'Valid formats: listing, full')
      .custom((format) => format === 'listing' || format === 'full')
      .optional(),
    resolveErrors,
  ])
  async getUsersResults(req: Request, res: Response, next: NextFunction) {
    const { format } = req.query
    const { id: userId } = req.user
    const requestUser = userId
    try {
      let results: ResultType<'full'>[] | ResultType<'listing'>[] // list must be all same type
      if (!format || format === 'full') {
        results = await this.resultService.getFullResultsByUser(
          userId,
          requestUser
        )
      } else {
        results = await this.resultService.getAllResultsByUserAsListing(
          userId,
          requestUser
        )
      }
      res.json(results)
    } catch (error) {
      return next(error)
    }
    return next()
  }

  /**
   * Updates the authenticated user's email
   */
  @Put('/me/email', [
    authenticate({ required: true }),
    validators.checkEmail,
    resolveErrors,
  ])
  async changeUserEmail(req: Request, res: Response, next: NextFunction) {
    const user = req.user.id
    const { email } = req.body
    try {
      const [success, err] = await this.userService.changeUserEmail(user, email)
      if (!success) {
        res.status(409).json({ errors: [err] })
        return next()
      }
      res.status(204).end()
    } catch (error) {
      return next(error)
    }
    return next()
  }

  /**
   * Updates the authenticated user's password
   */
  @Put('/me/password', [
    authenticate({ required: true }),
    validators.checkPassword,
    resolveErrors,
  ])
  async changeUserPassword(req: Request, res: Response, next: NextFunction) {
    const user = req.user.id
    const { password } = req.body
    try {
      await this.userService.changeUserPassword(user, password)
      res.status(204).end()
    } catch (error) {
      return next(error)
    }
    return next()
  }

  /**
   * Deletes a user
   */
  @Delete('/me', [authenticate({ required: true })])
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    const userId = req.user.id
    try {
      await this.userService.deleteUser(userId)
      res.status(204).end()
    } catch (error) {
      return next(error)
    }
    return next()
  }

  /**
   * Returns a user by their id without their email, password, or registration date
   * TODO: change omission of date to omission of results (not sure why I omitted date - not really sensitive)
   */
  @Get('/:id')
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const userData = await this.userService.getPublicUserById(req.params.id)
      if (userData == null) {
        res.status(404).end()
        return next()
      }
      res.json(userData)
    } catch (error) {
      return next(error)
    }
    return next()
  }

  /**
   * Authorizes a user
   */
  @Post('/auth', [
    check('username', 'Please enter your username.').isLength({
      min: 1,
      max: 50,
    }),
    check('password', 'Please enter your password.').isLength({
      min: 1,
      max: 50,
    }),
    resolveErrors,
  ])
  async authorizeUser(req: Request, res: Response, next: NextFunction) {
    const { username, password } = req.body
    try {
      const [token, err] = await this.userService.authorizeUser(
        username,
        password
      )
      if (token == null) {
        return res.status(400).json({ errors: [err] })
      }

      res.json({ token })
    } catch (error) {
      return next(error)
    }
    return next()
  }

  /**
   * Registers a user
   */
  @Post('/', [
    validators.checkUsername,
    validators.checkEmail,
    validators.checkPassword,
    resolveErrors,
  ])
  async registerUser(req: Request, res: Response, next: NextFunction) {
    const { username, email, password } = req.body
    try {
      const [token, errors] = await this.userService.registerUser({
        username,
        email,
        password,
      })

      if (token == null) {
        if (errors != null) {
          res.status(409).json({ errors: [...errors] })
        } else {
          res.status(400).end()
        }
        return next()
      }

      res.json({ token })
    } catch (error) {
      return next(error)
    }
    return next()
  }
}
