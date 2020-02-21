const debug = require('debug')
const express = require('express')
const { check, query } = require('express-validator')
const { debugRequests } = require('../middleware/logging')
const { authenticate } = require('../middleware/auth')
const { resolveErrors } = require('../middleware/validation/resolve-errors')
const validators = require('../middleware/validation/user')

const { UserController } = require('../controllers/user')
import { ServiceLocator } from '../services/servicelocator'

export const configUserRoute = (serviceLocator: ServiceLocator) => {
  const userController = new UserController(serviceLocator)

  const users = express.Router()
  users.use(debugRequests(debug('routes:user')))
  users.get(
    '/me',
    authenticate({ required: true }),
    userController.getUserData.bind(userController)
  )
  users.get(
    '/me/quizzes',
    authenticate({ required: true }),
    [
      query('format', 'Valid formats: listing, full')
        .custom(format => format === 'listing' || format === 'full')
        .optional()
    ],
    resolveErrors,
    userController.getUsersQuizzes.bind(userController)
  )
  users.get(
    '/me/results',
    authenticate({ required: true }),
    [
      query('format', 'Valid formats: listing, full')
        .custom(format => format === 'listing' || format === 'full')
        .optional()
    ],
    resolveErrors,
    userController.getUsersResults.bind(userController)
  )
  users.put(
    '/me/email',
    authenticate({ required: true }),
    [validators.checkEmail],
    resolveErrors,
    userController.changeUserEmail.bind(userController)
  )
  users.put(
    '/me/password',
    authenticate({ required: true }),
    [validators.checkPassword],
    resolveErrors,
    userController.changeUserPassword.bind(userController)
  )
  users.delete(
    '/me',
    authenticate({ required: true }),
    userController.deleteUser.bind(userController)
  )
  users.get('/:id', userController.getUserById.bind(userController))
  users.post(
    '/',
    [validators.checkUsername, validators.checkEmail, validators.checkPassword],
    resolveErrors,
    userController.registerUser.bind(userController)
  )

  users.post(
    '/auth',
    [
      check('username', 'Please enter your username.').isLength({
        min: 1,
        max: 50
      }),
      check('password', 'Please enter your password.').isLength({
        min: 1,
        max: 50
      })
    ],
    resolveErrors,
    userController.authorizeUser.bind(userController)
  )

  return users
}
