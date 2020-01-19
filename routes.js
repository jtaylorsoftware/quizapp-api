const debug = require('debug')
const express = require('express')
const { check, query } = require('express-validator')

const { debugRequests } = require('./middleware/logging')
const { authenticate } = require('./middleware/auth')
const { checkErrors } = require('./middleware/validation/checkerrors')
const quizValidators = require('./middleware/validation/quiz')

const { UserRepository } = require('./repositories/user')
const { QuizRepository } = require('./repositories/quiz')
const { ResultRepository } = require('./repositories/result')

const { UserService } = require('./services/user')
const { QuizService } = require('./services/quiz')
const { ResultService } = require('./services/result')

const { UserController } = require('./controllers/user')
const { QuizController } = require('./controllers/quiz')
const { ResultController } = require('./controllers/result')

const { ServiceLocator } = require('./services/servicelocator')

const configUsers = serviceLocator => {
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
    checkErrors,
    userController.getUsersQuizzes.bind(userController)
  )
  users.put(
    '/me/email',
    authenticate({ required: true }),
    [check('email', 'Email must be valid if present').isEmail()],
    checkErrors,
    userController.changeUserEmail.bind(userController)
  )
  users.put(
    '/me/password',
    authenticate({ required: true }),
    [
      check('password', 'Password must be 8 characters if present').custom(
        value => typeof value === 'string' && value.length >= 8
      )
    ],
    checkErrors,
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
    [
      check('username', 'Username is required')
        .notEmpty()
        .not()
        .equals('me'),
      check('email', 'A valid email is required').isEmail(),
      check(
        'password',
        'A password with 8 or more characters is required'
      ).custom(value => typeof value === 'string' && value.length >= 8)
    ],
    checkErrors,
    userController.registerUser.bind(userController)
  )

  users.post(
    '/auth',
    [
      check('username', 'A username is required').exists(),
      check('password', 'A password is required').exists()
    ],
    checkErrors,
    userController.authorizeUser.bind(userController)
  )

  return users
}

const configQuizzes = serviceLocator => {
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
    checkErrors,
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
      quizValidators.checkQuizTitle,
      quizValidators.checkPublic,
      quizValidators.checkExpiresIn,
      quizValidators.checkAllowedUsers,
      quizValidators.checkQuestions
    ],
    checkErrors,
    quizController.createQuiz.bind(quizController)
  )
  quizzes.put(
    '/:id/edit',
    authenticate({ required: true }),
    [
      quizValidators.checkQuizTitle,
      quizValidators.checkPublic,
      quizValidators.checkExpiresIn,
      quizValidators.checkAllowedUsers,
      quizValidators.checkQuestions
    ],
    checkErrors,
    quizController.editQuiz.bind(quizController)
  )

  quizzes.delete(
    '/:id',
    authenticate({ required: true }),
    quizController.deleteQuiz.bind(quizController)
  )

  return quizzes
}

const configResults = serviceLocator => {
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
    checkErrors,
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
    checkErrors,
    resultController.postResult.bind(resultController)
  )
  return results
}

exports.config = db => {
  let userRepository
  let quizRepository
  let resultRepository

  db.collection('users', (error, collection) => {
    if (error) {
      throw error
    }
    userRepository = new UserRepository(collection)
  })

  db.collection('quizzes', (error, collection) => {
    if (error) {
      throw error
    }
    quizRepository = new QuizRepository(collection)
  })

  db.collection('results', (error, collection) => {
    if (error) {
      throw error
    }
    resultRepository = new ResultRepository(collection)
  })

  const userService = new UserService(userRepository)
  const quizService = new QuizService(quizRepository)
  const resultService = new ResultService(resultRepository)
  const serviceLocator = new ServiceLocator(
    userService,
    quizService,
    resultService
  )

  return {
    users: configUsers(serviceLocator),
    quizzes: configQuizzes(serviceLocator),
    results: configResults(serviceLocator)
  }
}
