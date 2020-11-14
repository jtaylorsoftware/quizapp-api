const debug = require('debug')('routes:user')

import jwt from 'jsonwebtoken'
import { check, query } from 'express-validator'

import resolveErrors from 'middleware/validation/resolve-errors'
import * as validators from 'middleware/validation/user'
import authenticate from 'middleware/auth'

import { Inject, Get, Put, Post, Delete, Controller } from 'express-di'

import QuizService from 'services/quiz'
import ResultService from 'services/result'
import UserService from 'services/user'

@Inject
export default class UserController extends Controller({ root: '/api/users' }) {
  constructor(
    private quizzes: QuizService,
    private results: ResultService,
    private users: UserService
  ) {
    super()
  }

  /**
   * Returns an authenticated user's info without sensitive info,
   * @param req request object
   * @param req.user user with id property
   */
  @Get('/me', [authenticate({ required: true })])
  async getUserData(req, res, next) {
    try {
      const user = await this.users.getUserById(req.user.id)
      if (!user) {
        res.status(401).end()
        return next()
      }
      res.json(user)
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }
  /**
   * Returns the user's quizzes as either listing or full data.
   * By default, full if no query string supplied.
   * @param req request object
   * @param req.query request query object
   * @param req.query.format string describing if format is full or listing
   */
  @Get('/me/quizzes', [
    authenticate({ required: true }),
    query('format', 'Valid formats: listing, full')
      .custom(format => format === 'listing' || format === 'full')
      .optional(),
    resolveErrors
  ])
  async getUsersQuizzes(req, res, next) {
    const { format } = req.query
    const { id: userId } = req.user
    try {
      const quizIds = await this.users.getUserQuizzes(userId)
      if (quizIds.length === 0) {
        res.json([])
        return next()
      }
      const quizzes = []
      for (const id of quizIds) {
        const quiz = await this.quizzes.getQuizById(id)
        if (quiz) {
          if (!format || format === 'full') {
            // convert allowed users to usernames
            const allowedUsers = await this.users.getUsernamesFromIds(
              quiz.allowedUsers
            )
            quiz.allowedUsers = allowedUsers
            quizzes.push(quiz)
          } else {
            const { questions, results, allowedUsers, ...listing } = quiz
            listing.resultsCount = results.length
            listing.questionCount = questions.length
            quizzes.push(listing)
          }
        }
      }

      res.json(quizzes)
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Returns the user's results for all quizzes as listing or full format.
   * @param req request object
   * @param req.query request query object
   * @param req.query.format string describing if format is full or listing
   */
  @Get('/me/results', [
    authenticate({ required: true }),
    query('format', 'Valid formats: listing, full')
      .custom(format => format === 'listing' || format === 'full')
      .optional(),
    resolveErrors
  ])
  async getUsersResults(req, res, next) {
    const { format } = req.query
    const { id: userId } = req.user
    try {
      const resultIds = await this.users.getUserResults(userId)
      if (resultIds.length === 0) {
        res.json([])
        return next()
      }
      const results = []
      for (const id of resultIds) {
        const result = await this.results.getResult(id)
        if (result) {
          // get the quiz title and created by
          const quiz = await this.quizzes.getQuizById(result.quiz)
          if (quiz) {
            result.quizTitle = quiz.title
            const owner = await this.users.getUserById(result.quizOwner)
            if (owner) {
              result.ownerUsername = owner.username
            }
          }
          if (!format || format === 'full') {
            results.push(result)
          } else {
            const { answers, ...listing } = result
            results.push(listing)
          }
        }
      }

      res.json(results)
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Updates the authenticated user's email
   * @param req request object
   * @param req.user user with id property
   * @param req.body json body of request
   * @param req.body.email the new email to use
   */
  @Put('/me/email', [
    authenticate({ required: true }),
    validators.checkEmail,
    resolveErrors
  ])
  async changeUserEmail(req, res, next) {
    const user = req.user.id
    const { email } = req.body
    try {
      const emailWasSet = await this.users.changeUserEmail(user, email)
      if (!emailWasSet) {
        res.status(409).json({
          errors: [{ email: 'Email is already in use.', value: email }]
        })
        return next()
      }
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Updates the authenticated user's password
   * @param req request object
   * @param req.user user with id property
   * @param req.body json body of request
   * @param req.body.password the new password to use
   */
  @Put('/me/password', [
    authenticate({ required: true }),
    validators.checkPassword,
    resolveErrors
  ])
  async changeUserPassword(req, res, next) {
    const user = req.user.id
    const { password } = req.body
    try {
      await this.users.changeUserPassword(user, password)
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Deletes a user
   * @param req request object
   * @param req.user user with id property
   */
  @Delete('/me', [authenticate({ required: true })])
  async deleteUser(req, res, next) {
    const userId = req.user.id
    try {
      const user = await this.users.getUserById(userId)
      if (!user) {
        res.status(404).end()
        return next()
      }
      // Clean up user's results
      const results = user.results
      for (const resultId of results) {
        const result = await this.results.getResult(resultId)
        if (result) {
          const quiz = await this.quizzes.getQuizById(result.quiz)
          if (quiz) {
            await this.quizzes.removeResult(quiz._id, resultId)
          }
          await this.results.deleteResult(resultId)
        }
      }
      // Clean up users's quizzes completley including results to those quizzes
      const quizzes = user.quizzes
      for (const quizId of quizzes) {
        const quiz = await this.quizzes.getQuizById(quizId)
        if (quiz) {
          const quizResults = quiz.results
          for (const resultId of quizResults) {
            const result = await this.results.getResult(resultId)
            if (result) {
              await this.results.deleteResult(resultId)
              await this.users.removeResult(result.user, result)
            }
          }
          await this.quizzes.deleteQuiz(quizId)
        }
      }

      await this.users.deleteUser(userId)
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Returns a user by their id without their email, password, or registration date
   * @param req request object
   * @param req.params request params
   * @param req.params.id id of user to find
   */
  @Get('/:id')
  async getUserById(req, res, next) {
    try {
      const userData = await this.users.getUserById(req.params.id)
      if (!userData) {
        res.status(404).end()
        return next()
      }
      const { email, date, results, ...user } = userData
      res.json(user)
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Authorizes a user
   * @param req request object
   * @param req.body json body of request
   * @param req.body.username the user's username
   * @param req.body.password the user's password
   */
  @Post('/auth', [
    check('username', 'Please enter your username.').isLength({
      min: 1,
      max: 50
    }),
    check('password', 'Please enter your password.').isLength({
      min: 1,
      max: 50
    }),
    resolveErrors
  ])
  async authorizeUser(req, res, next) {
    const { username, password } = req.body
    try {
      const [userId, errors] = await this.users.authorizeUser(
        username,
        password
      )
      if (!userId) {
        return res.status(400).json({ errors: errors })
      }
      // the jwt will contain the user's id
      const payload = {
        user: {
          id: userId
        }
      }

      // use jwt to sign the payload with the secret
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: 3600 * 24
      })
      res.json({ token })
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Registers a user
   * @param req request object
   * @param req.body json body of request
   * @param req.body.username the user's username
   * @param req.body.password the user's password
   * @param req.body.email the user's email
   */
  @Post('/', [
    validators.checkUsername,
    validators.checkEmail,
    validators.checkPassword,
    resolveErrors
  ])
  async registerUser(req, res, next) {
    const { username, email, password } = req.body
    try {
      const [userId, errors] = await this.users.registerUser({
        username,
        email,
        password
      })

      if (!userId) {
        res.status(409).json({ errors: [...errors] })
        return next()
      }

      const payload = {
        user: {
          id: userId
        }
      }

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: 3600 * 24
      })
      res.json({ token })
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }
}
