import { NextFunction, Request, Response } from 'express'
import { query } from 'express-validator'

import { Controller, Delete, Get, Inject, Post, Put } from 'express-di'

import authenticate from 'middleware/auth'
import * as validators from 'middleware/validation/quiz'
import resolveErrors from 'middleware/validation/resolve-errors-v2'

import { QuizUploadData } from 'models/quiz'
import QuizService from 'services/v2/quiz'
import { ALLOWED_ROLES_ANY } from 'models/user'

type QuizParams = {
  id: string
}

@Inject
export default class QuizControllerV2 extends Controller({
  root: '/api/v2/quizzes',
}) {
  constructor(private quizService: QuizService) {
    super()
  }

  /**
   * Returns a quiz's data as a listing or full format only if the request user
   * owns the quiz.
   */
  @Get('/:id', [
    authenticate({ allowedRoles: ['teacher'] }),
    query('format', 'Valid formats: listing, full')
      .custom((format) => format === 'listing' || format === 'full')
      .optional(),
    resolveErrors,
  ])
  async getQuiz(req: Request<QuizParams>, res: Response, next: NextFunction) {
    const { id: userId } = req.user!
    const { id: quizId } = req.params
    const { format } = req.query
    try {
      if (!format || format === 'full') {
        const quiz = await this.quizService.getFullQuiz(quizId, userId)
        if (quiz == null) {
          res.status(404).end()
        } else {
          res.json(quiz)
        }
      } else {
        const quiz = await this.quizService.getQuizListing(quizId, userId)
        if (quiz == null) {
          res.status(404).end()
        } else {
          res.json(quiz)
        }
      }
    } catch (error) {
      return next(error)
    }
    return next()
  }

  /**
   * Returns a quiz as a form for a user to answer.
   */
  @Get('/:id/form', [authenticate({ allowedRoles: ALLOWED_ROLES_ANY })])
  async getQuizForm(
    req: Request<QuizParams>,
    res: Response,
    next: NextFunction
  ) {
    const { id: userId } = req.user!
    const { id: quizId } = req.params
    try {
      const form = await this.quizService.getQuizForm(quizId, userId)
      if (form == null) {
        res.status(404).end()
      } else {
        res.json(form)
      }
    } catch (error) {
      return next(error)
    }
    return next()
  }

  /**
   * Creates a new quiz
   */
  @Post('/', [
    authenticate({ allowedRoles: ['teacher'] }),
    validators.checkTitle,
    validators.checkIsPublic,
    validators.checkPublishResults,
    validators.checkExpiration,
    validators.checkAllowedUsers,
    validators.checkQuestions,
    resolveErrors,
  ])
  async createQuiz(req: Request, res: Response, next: NextFunction) {
    const { id: userId } = req.user!
    const {
      title,
      isPublic,
      questions,
      allowedUsers,
      showCorrectAnswers,
      allowMultipleResponses,
      publishResults,
      ...rest
    } = req.body
    const expiration = new Date(req.body.expiration).toISOString()
    try {
      const quizData: QuizUploadData = {
        title,
        expiration,
        isPublic,
        questions,
        allowedUsers,
        showCorrectAnswers,
        allowMultipleResponses,
        publishResults,
      }
      const quizId = await this.quizService.createQuiz(quizData, userId)
      res.json({ id: quizId })
    } catch (error) {
      return next(error)
    }
    return next()
  }

  /**
   * Edits an existing quiz
   */
  @Put('/:id/edit', [
    authenticate({ allowedRoles: ['teacher'] }),
    validators.checkTitle,
    validators.checkIsPublic,
    validators.checkPublishResults,
    validators.checkAllowedUsers,
    validators.checkQuestions,
    resolveErrors,
  ])
  async editQuiz(req: Request<QuizParams>, res: Response, next: NextFunction) {
    const { user } = req
    const {
      title,
      isPublic,
      publishResults,
      expiration,
      questions,
      allowedUsers,
      ...rest
    } = req.body
    const { id: quizId } = req.params

    try {
      const edits: QuizUploadData = {
        title,
        expiration,
        isPublic,
        publishResults,
        questions,
        allowedUsers,
      }
      const errors = await this.quizService.updateQuiz(quizId, user!.id, edits)
      if (errors.length === 0) {
        res.status(204).end()
      } else {
        res.status(409).json({ errors })
      }
    } catch (error) {
      return next(error)
    }

    return next()
  }

  /**
   * Deletes a quiz
   */
  @Delete('/:id', [authenticate({ allowedRoles: ['teacher'] })])
  async deleteQuiz(
    req: Request<QuizParams>,
    res: Response,
    next: NextFunction
  ) {
    const { user } = req
    const { id: quizId } = req.params

    try {
      await this.quizService.deleteQuiz(quizId, user!.id)
      res.status(204).end()
    } catch (error) {
      return next(error)
    }
    return next()
  }
}
