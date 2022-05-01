import { NextFunction, Request, Response } from 'express'
import { query } from 'express-validator'

import authenticate from 'middleware/auth'
import resolveErrors from 'middleware/validation/resolve-errors-v2'
import * as validators from 'middleware/validation/result'

import { Controller, Get, Inject, Post } from 'express-di'

import { ResultType } from 'models/result'
import ResultService from 'services/v2/result'

@Inject
export default class ResultControllerV2 extends Controller({
  root: '/api/v2/results',
}) {
  constructor(private resultService: ResultService) {
    super()
  }

  /**
   * Gets a user's or all results for a quiz as listings or full
   */
  @Get('/', [
    query('format', 'Valid formats: listing, full')
      .custom((format) => format === 'listing' || format === 'full')
      .optional(),
    query('quiz', 'Quiz id is required').exists(),
    query('user').exists().optional(),
    resolveErrors,
    authenticate({ required: true }),
  ])
  async getResult(req: Request, res: Response, next: NextFunction) {
    const { id: userId } = req.user
    const { format, user: queryUser, quiz: quizId } = req.query
    const requestUser = userId
    if (
      !(typeof quizId === 'string') ||
      (queryUser != null && !(typeof queryUser === 'string'))
    ) {
      res.status(400).end()
      return next()
    }

    try {
      if (!queryUser) {
        // No user specified in query, so return all for quiz
        let results: ResultType<'full'>[] | ResultType<'listing'>[] // must be list of same type
        if (!format || format === 'full') {
          results = await this.resultService.getAllFullResultsForQuiz(
            quizId,
            requestUser
          )
        } else {
          results = await this.resultService.getAllResultListingForQuiz(
            quizId,
            requestUser
          )
        }
        res.json({ results })
      } else {
        // User and quiz both specified, so return a single result for that user

        let result: ResultType<'full' | 'listing'> | null
        if (!format || format === 'full') {
          result = await this.resultService.getFullUserResultForQuiz(
            queryUser,
            quizId,
            requestUser
          )
        } else {
          result = await this.resultService.getUserResultListingForQuiz(
            queryUser,
            quizId,
            requestUser
          )
        }

        if (result == null) {
          res.status(404).end()
          return next()
        }

        res.json(result)
      }
    } catch (error) {
      next(error)
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
    resolveErrors,
  ])
  async postResult(req: Request, res: Response, next: NextFunction) {
    const { id: userId } = req.user
    const { answers } = req.body
    const { quiz: quizId } = req.query

    if (!(typeof quizId === 'string')) {
      res.status(400).end()
      return next()
    }

    try {
      const [resultId, errors] = await this.resultService.createResult(
        answers,
        userId,
        quizId
      )

      if (!resultId) {
        res.status(400).json({ errors: [...errors] })
        return next()
      }

      res.json({ id: resultId })
    } catch (error) {
      next(error)
    }
    return next()
  }
}
