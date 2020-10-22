const debug = require('debug')('routes:quiz')
import { isValidExpiration } from '../middleware/validation/quiz'
import { query } from 'express-validator'

import authenticate from '../middleware/auth'
import resolveErrors from '../middleware/validation/resolve-errors'
import * as validators from '../middleware/validation/quiz'

import { Config, Get, Put, Post, Delete, Controller } from './controller'

@Config({ debugName: 'quiz' })
export default class QuizController extends Controller {
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
  async getQuiz(req, res, next) {
    const { id: userId } = req.user
    const { id: quizId } = req.params
    const { format } = req.query
    try {
      const quiz = await this.serviceLocator.quiz.getQuizById(quizId)
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
        const allowedUsers = await this.serviceLocator.user.getUsernamesFromIds(
          quiz.allowedUsers
        )

        quiz.allowedUsers = allowedUsers
        res.json(quiz)
      } else {
        const { questions, results, allowedUsers, ...listing } = quiz
        listing.resultsCount = results.length
        listing.questionCount = questions.length
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
  async getQuizForm(req, res, next) {
    const { id: userId } = req.user
    const { id: quizId } = req.params
    try {
      const quiz = await this.serviceLocator.quiz.getQuizById(quizId)
      if (!quiz) {
        res.status(404).end()
        return next()
      }

      if (!this.canUserViewQuiz(userId, quiz)) {
        res.status(403).end()
        return next()
      }
      const answerForm = this.convertToAnswerForm(quiz)
      const [username] = await this.serviceLocator.user.getUsernamesFromIds([
        answerForm.user
      ])
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
  async createQuiz(req, res, next) {
    const { id: userId } = req.user
    const { title, isPublic, questions, ...quiz } = req.body
    const expiration = new Date(req.body.expiration).toISOString()
    try {
      const user = await this.serviceLocator.user.getUserById(userId)
      if (!user) {
        res.status(400).end()
        return next()
      }
      const allowedUsers = await this.serviceLocator.user.getIdsFromUsernames(
        quiz.allowedUsers || []
      )
      const quizId = await this.serviceLocator.quiz.createQuiz({
        user: user._id,
        title,
        expiration,
        isPublic,
        questions,
        allowedUsers
      })
      await this.serviceLocator.user.addQuiz(userId, quizId)
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
  async editQuiz(req, res, next) {
    const { user } = req
    const quiz = req.body

    const { id: quizId } = req.params
    if (!this.userOwnsQuiz(user.id, quizId)) {
      res.status(403).end()
      return next()
    }
    try {
      const existingQuiz = await this.serviceLocator.quiz.getQuizById(quizId)
      if (!existingQuiz) {
        res.status(400).end()
        return next()
      }
      if (
        !isValidExpiration(quiz.expiration) &&
        quiz.expiration !== existingQuiz.expiration
      ) {
        res.status(400).json({
          errors: [
            {
              expiration: 'Expiration must be a date and time in the future',
              value: quiz.expiration
            }
          ]
        })
        return next()
      }
      const existingAnswers = existingQuiz.questions.map(q => q.correctAnswer)
      const quizAnswers = quiz.questions.map(q => q.correctAnswer)
      if (
        existingAnswers.length !== quizAnswers.length ||
        !existingAnswers.every((ans, ind) => ans === quizAnswers[ind])
      ) {
        res.status(409).json({
          errors: [
            {
              questions:
                'Cannot change correctAnswers or number of questions for existing quiz',
              value: quiz
            }
          ]
        })
        return next()
      }
      const allowedUsers = new Set(
        await this.serviceLocator.user.getIdsFromUsernames(
          quiz.allowedUsers || []
        )
      )

      // Merge user IDs from existing results with the edit's IDs so
      // the edit cannot remove users that have already taken quiz.
      for (const resultId of existingQuiz.results) {
        const result = await this.serviceLocator.result.getResult(resultId)
        const user = await this.serviceLocator.user.getUserById(result.user)
        allowedUsers.add(user._id)
      }
      quiz.allowedUsers = [...allowedUsers]

      await this.serviceLocator.quiz.updateQuiz(quizId, quiz)
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
  async deleteQuiz(req, res, next) {
    const { user } = req
    const { id: quizId } = req.params
    if (!this.userOwnsQuiz(user.id, quizId)) {
      res.status(403).end()
      return next()
    }
    try {
      const quiz = await this.serviceLocator.quiz.getQuizById(quizId)
      // Clean up references to this quiz before finally deleting it
      if (!quiz) {
        return res.status(404).end()
      }
      for (const resultId of quiz.results) {
        const result = await this.serviceLocator.result.getResult(resultId)
        if (result) {
          await this.serviceLocator.result.deleteResult(resultId)
          await this.serviceLocator.user.removeResult(result.user, resultId)
        }
      }
      await this.serviceLocator.user.removeQuiz(quiz.user, quizId)
      await this.serviceLocator.quiz.deleteQuiz(quizId)
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  private userOwnsQuiz(userId, quizId) {
    return userId !== quizId
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
