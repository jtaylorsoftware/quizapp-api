const express = require('express')
const { query } = require('express-validator')

const { debugRequests } = require('../middleware/logging')
const { authenticate } = require('../middleware/auth')
const validators = require('../middleware/validation/result')
const { resolveErrors } = require('../middleware/validation/resolve-errors')

const debug = require('debug')

const { ResultController } = require('../controllers/result')
import { ServiceLocator } from '../services/servicelocator'

export const configResultRoute = (serviceLocator: ServiceLocator) => {
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
    [validators.checkAnswers, query('quiz', 'Quiz id is required').exists()],
    resolveErrors,
    resultController.postResult.bind(resultController)
  )
  return results
}
