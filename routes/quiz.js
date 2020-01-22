const express = require('express')
const { query } = require('express-validator')

const { debugRequests } = require('../middleware/logging')
const { authenticate } = require('../middleware/auth')
const { resolveErrors } = require('../middleware/validation/resolve-errors')
const validators = require('../middleware/validation/quiz')
const debug = require('debug')

const { QuizController } = require('../controllers/quiz')

exports.configQuizRoute = serviceLocator => {
  const quizController = new QuizController(serviceLocator)

  const quizzes = express.Router()
  quizzes.use(debugRequests(debug('routes:quiz')))

  quizzes.get(
    '/:id',
    [
      query('format', 'Valid formats: listing, full')
        .custom(format => format === 'listing' || format === 'full')
        .optional()
    ],
    resolveErrors,
    authenticate({ required: true }),
    quizController.getQuiz.bind(quizController)
  )
  quizzes.get(
    '/:id/form',
    authenticate({ required: true }),
    quizController.getQuizForm.bind(quizController)
  )
  quizzes.post(
    '/',
    authenticate({ required: true }),
    [
      validators.checkTitle,
      validators.checkIsPublic,
      validators.checkExpiration,
      validators.checkAllowedUsers,
      validators.checkQuestions
    ],
    resolveErrors,
    quizController.createQuiz.bind(quizController)
  )
  quizzes.put(
    '/:id/edit',
    authenticate({ required: true }),
    [
      validators.checkTitle,
      validators.checkIsPublic,
      validators.checkExpiration,
      validators.checkAllowedUsers,
      validators.checkQuestions
    ],
    resolveErrors,
    quizController.editQuiz.bind(quizController)
  )

  quizzes.delete(
    '/:id',
    authenticate({ required: true }),
    quizController.deleteQuiz.bind(quizController)
  )

  return quizzes
}
