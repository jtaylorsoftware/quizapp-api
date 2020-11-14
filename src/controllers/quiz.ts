const debug = require('debug')('routes:quiz')

import { isValidExpiration } from '../middleware/validation/quiz'
import { query } from 'express-validator'
import { Request, Response, NextFunction } from 'express'

import authenticate from '../middleware/auth'
import resolveErrors from 'middleware/validation/resolve-errors'
import * as validators from 'middleware/validation/quiz'

import { Get, Put, Post, Delete, Controller, Inject } from 'express-di'

import QuizService from 'services/quiz'
import ResultService from 'services/result'
import UserService from 'services/user'

@Inject
export default class QuizController extends Controller({
  root: '/api/quizzes'
}) {
  constructor(
    private quizzes: QuizService,
    private results: ResultService,
    private users: UserService
  ) {
    super()
  }

  /**
   * Returns a quiz's data as a listing or full format only if signed in user owns quiz
   */
  @Get('/:id', [
    query('format', 'Valid formats: listing, full')
      .custom(format => format === 'listing' || format === 'full')
      .optional(),
    resolveErrors,
    authenticate({ required: true })
  ])
  async getQuiz(req: Request, res: Response, next: NextFunction) {
    const { id: userId } = req.user
    const { id: quizId } = req.params
    const { format } = req.query
    try {
      const quiz = await this.quizzes.getQuizById(quizId)
      if (!quiz) {
        res.status(404).end()
        return next()
      }
      const isQuizOwner = userId === quiz.user.toString()
      if (!isQuizOwner) {
        res.status(403).end()
        return next()
      }
      if (!format || format === 'full') {
        // convert allowed users to usernames
        const allowedUsernames = await this.users.getUsernamesFromIds(
          quiz.allowedUsers
        )
        const { allowedUsers, ...quizWithUsernames } = quiz
        quizWithUsernames['allowedUsers'] = allowedUsernames
        res.json(quizWithUsernames)
      } else {
        const { questions, results, allowedUsers, ...listing } = quiz
        listing['resultsCount'] = results.length
        listing['questionCount'] = questions.length
        res.json(listing)
      }
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Returns a quiz as a form for a user to answer
   */
  @Get('/:id/form', [authenticate({ required: true })])
  async getQuizForm(req: Request, res: Response, next: NextFunction) {
    const { id: userId } = req.user
    const { id: quizId } = req.params
    try {
      const quiz = await this.quizzes.getQuizById(quizId)
      if (!quiz) {
        res.status(404).end()
        return next()
      }

      if (!this.canUserViewQuiz(userId, quiz)) {
        res.status(403).end()
        return next()
      }
      const answerForm = this.convertToAnswerForm(quiz)
      const [username] = await this.users.getUsernamesFromIds([answerForm.user])
      answerForm.user = username
      res.json(answerForm)
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Creates a new quiz
   */
  @Post('/', [
    authenticate({ required: true }),
    validators.checkTitle,
    validators.checkIsPublic,
    validators.checkExpiration,
    validators.checkAllowedUsers,
    validators.checkQuestions,
    resolveErrors
  ])
  async createQuiz(req: Request, res: Response, next: NextFunction) {
    const { id: userId } = req.user
    const { title, isPublic, questions, ...quiz } = req.body
    const expiration = new Date(req.body.expiration).toISOString()
    try {
      const user = await this.users.getUserById(userId)
      if (!user) {
        res.status(400).end()
        return next()
      }
      const allowedUsers = await this.users.getIdsFromUsernames(
        quiz.allowedUsers || []
      )
      const quizId = await this.quizzes.createQuiz({
        user: user._id,
        title,
        expiration,
        isPublic,
        questions,
        allowedUsers
      })
      await this.users.addQuiz(userId, quizId)
      res.json({ id: quizId })
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Edits an existing quiz
   */
  @Put('/:id/edit', [
    authenticate({ required: true }),
    validators.checkTitle,
    validators.checkIsPublic,
    validators.checkAllowedUsers,
    validators.checkQuestions,
    resolveErrors
  ])
  async editQuiz(req: Request, res: Response, next: NextFunction) {
    const { user } = req
    const quizEdits = req.body
    const { id: quizId } = req.params

    try {
      const existingQuiz = await this.quizzes.getQuizById(quizId)
      if (!existingQuiz) {
        res.status(400).end()
        return next()
      }
      if (!this.userOwnsQuiz(user.id, existingQuiz)) {
        res.status(403).end()
        return next()
      }
      if (
        !isValidExpiration(quizEdits.expiration) &&
        quizEdits.expiration !== existingQuiz.expiration
      ) {
        res.status(400).json({
          errors: [
            {
              expiration: 'Expiration must be a date and time in the future',
              value: quizEdits.expiration
            }
          ]
        })
        return next()
      }

      const questionsCompatible = (q1, q2) => {
        return (
          q1.correctAnswer === q2.correctAnswer &&
          q1.answers.length === q2.answers.length
        )
      }

      if (
        existingQuiz.questions.length !== quizEdits.questions.length ||
        !existingQuiz.questions.every((question, ind) =>
          questionsCompatible(question, quizEdits.questions[ind])
        )
      ) {
        res.status(409).json({
          errors: [
            {
              questions:
                'Cannot change correctAnswers or number of questions for existing quiz',
              value: quizEdits
            }
          ]
        })
        return next()
      }
      const allowedUsers = new Set(
        await this.users.getIdsFromUsernames(quizEdits.allowedUsers || [])
      )

      // Merge user IDs from existing results with the edit's IDs so
      // the edit cannot remove users that have already taken quiz.
      for (const resultId of existingQuiz.results) {
        const result = await this.results.getResult(resultId)
        const user = await this.users.getUserById(result.user)
        allowedUsers.add(user._id)
      }
      quizEdits.allowedUsers = [...allowedUsers]

      await this.quizzes.updateQuiz(quizId, quizEdits)
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).end()
    }

    return next()
  }

  /**
   * Deletes a quiz
   */
  @Delete('/:id', [authenticate({ required: true })])
  async deleteQuiz(req: Request, res: Response, next: NextFunction) {
    const { user } = req
    const { id: quizId } = req.params

    try {
      const quiz = await this.quizzes.getQuizById(quizId)
      // Clean up references to this quiz before finally deleting it
      if (!quiz) {
        return res.status(404).end()
      }
      if (!this.userOwnsQuiz(user.id, quiz)) {
        res.status(403).end()
        return next()
      }
      for (const resultId of quiz.results) {
        const result = await this.results.getResult(resultId)
        if (result) {
          await this.results.deleteResult(resultId)
          await this.users.removeResult(result.user, resultId)
        }
      }
      await this.users.removeQuiz(quiz.user, quizId)
      await this.quizzes.deleteQuiz(quizId)
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  private userOwnsQuiz(userId, quiz) {
    return userId === quiz.user.toString()
  }

  private canUserViewQuiz(userId, quiz) {
    return (
      quiz.isPublic ||
      quiz.user.toString() === userId ||
      quiz.allowedUsers.some(id => id.toString() === userId)
    )
  }

  private convertToAnswerForm(quiz) {
    const {
      allowedUsers,
      showCorrectAnswers,
      allowMultipleResponses,
      isPublic,
      results,
      ...answerForm
    } = quiz
    for (let i = 0; i < answerForm.questions.length; ++i) {
      const { correctAnswer, ...question } = answerForm.questions[i]
      answerForm.questions[i] = question
    }
    return answerForm
  }
}
