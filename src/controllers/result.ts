const debug = require('debug')('routes:result')

import moment from 'moment'
import { query } from 'express-validator'
import { Request, Response, NextFunction } from 'express'

import resolveErrors from 'middleware/validation/resolve-errors'
import * as validators from 'middleware/validation/result'
import authenticate from 'middleware/auth'

import { Inject, Get, Post, Controller } from 'express-di'

import QuizService from 'services/quiz'
import ResultService from 'services/result'
import UserService from 'services/user'
import { ObjectId } from 'mongodb'
import Quiz from 'models/quiz'

@Inject
export default class ResultController extends Controller({
  root: '/api/results'
}) {
  constructor(
    private quizzes: QuizService,
    private results: ResultService,
    private users: UserService
  ) {
    super()
  }

  /**
   * Gets a user's or all results for a quiz as listings or full
   */
  @Get('/', [
    query('format', 'Valid formats: listing, full')
      .custom(format => format === 'listing' || format === 'full')
      .optional(),
    query('quiz', 'Quiz id is required').exists(),
    query('user').exists().optional(),
    resolveErrors,
    authenticate({ required: true })
  ])
  async getResult(req: Request, res: Response, next: NextFunction) {
    const { id: userId } = req.user
    const { format, user: queryUser, quiz: quizId } = req.query
    try {
      if (!queryUser) {
        // get all results for the quiz
        const quiz = await this.quizzes.getQuizById(<string>quizId)
        if (quiz) {
          if (quiz.user.toString() !== userId) {
            res.status(403).end()
            return next()
          }
        } else {
          res.status(404).end()
          return next()
        }
        const results = []
        for (const resultId of quiz.results) {
          const result = await this.results.getResult(resultId)
          if (result) {
            const resultUser = await this.users.getUserById(result.user)
            if (resultUser) {
              result['username'] = resultUser['username']
            }
            if (!format || format === 'full') {
              results.push(result)
            } else {
              const { answers, ...listing } = result
              results.push(listing)
            }
          }
        }
        res.json({ results })
      } else {
        const result = await this.results.getUserResultForQuiz(
          <string>queryUser,
          <string>quizId
        )
        if (!result) {
          res.status(404).end()
          return next()
        }
        const isResultOwner = result.user.toString() === userId
        const isQuizOwner = result.quizOwner.toString() === userId
        if (!isResultOwner && !isQuizOwner) {
          res.status(403).end()
          return next()
        }
        const resultUser = await this.users.getUserById(result.user)
        if (resultUser) {
          result['username'] = resultUser['username']
        }

        // get the quiz title and created by
        const quiz = await this.quizzes.getQuizById(<string>quizId)
        if (quiz) {
          result['quizTitle'] = quiz.title
          const owner = await this.users.getUserById(result.quizOwner)
          if (owner) {
            result['ownerUsername'] = owner['username']
          }
        }
        if (!format || format === 'full') {
          res.json(result)
        } else {
          const { answers, ...listing } = result
          res.json(listing)
        }
      }
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Posts a response to a quiz
   */
  @Post('/', [
    authenticate({ required: true }),
    validators.checkAnswers,
    query('quiz', 'Quiz id is required').exists(),
    resolveErrors
  ])
  async postResult(req: Request, res: Response, next: NextFunction) {
    const { id: userId } = req.user
    const { answers } = req.body
    const { quiz: quizId } = req.query

    try {
      const quiz = await this.quizzes.getQuizById(<string>quizId)
      if (!quiz) {
        res.status(404).end()
        return next()
      }
      if (!this.canUserViewQuiz(userId, quiz)) {
        res.status(403).end()
        return next()
      }

      if (moment(quiz.expiration).diff(moment()) < 0) {
        // quiz expired
        res.status(403).json({ errors: [{ expiration: 'Quiz has expired' }] })
        return next()
      }

      const [resultId, errors] = await this.results.createResult(
        answers,
        userId,
        quiz
      )

      if (!resultId) {
        res.status(400).json({ errors: [...errors] })
        return next()
      }
      await this.users.addResult(userId, resultId)
      await this.quizzes.addResult(quiz._id, resultId)

      res.json({ id: resultId })
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  private canUserViewQuiz(userId: string, quiz: Quiz) {
    return (
      quiz.isPublic ||
      quiz.user.toString() === userId ||
      quiz.allowedUsers.some(id => id.toString() === userId)
    )
  }
}
