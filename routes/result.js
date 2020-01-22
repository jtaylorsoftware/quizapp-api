const express = require('express')
const { check, query } = require('express-validator')

const { debugRequests } = require('../middleware/logging')
const { authenticate } = require('../middleware/auth')
const { resolveErrors } = require('../middleware/validation/resolve-errors')

const debug = require('debug')

const { ResultController } = require('../controllers/result')

exports.configResultRoute = serviceLocator => {
  const resultController = new ResultController(serviceLocator)

  const results = express.Router()
  results.use(debugRequests(debug('routes:result')))

  results.get(
    '/',
    [
      query('format', 'Valid formats: listing, full')
        .custom(format => format === 'listing' || format === 'full')
        .optional(),
      query('quiz', 'Quiz id is required').exists(),
      query('user')
        .exists()
        .optional()
    ],
    resolveErrors,
    authenticate({ required: true }),
    resultController.getResult.bind(resultController)
  )
  results.post(
    '/',
    authenticate({ required: true }),
    [
      check('answers', 'Answers must be valid').custom(answers => {
        return (
          answers instanceof Array &&
          answers.every(
            answer =>
              typeof answer === 'object' && typeof answer.choice === 'number'
          )
        )
      }),
      query('quiz', 'Quiz id is required').exists()
    ],
    resolveErrors,
    resultController.postResult.bind(resultController)
  )
  return results
}
