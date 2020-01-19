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

const { UserController } = require('./controllers/user')
const { QuizController } = require('./controllers/quiz')
const { ResultController } = require('./controllers/result')

const { UserRouter } = require('./routers/user')
const { QuizRouter } = require('./routers/quiz')
const { ResultRouter } = require('./routers/result')

const configUsers = (userRepository, quizRepository) => {
  const userController = new UserController(userRepository, quizRepository)
  const userRouter = new UserRouter(userController)

  const users = express.Router()
  users.use(debugRequests(debug('routes:user')))
  users.get(
    '/me',
    authenticate({ required: true }),
    userRouter.getUserData.bind(userRouter)
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
    userRouter.getUsersQuizzes.bind(userRouter)
  )
  users.put(
    '/me/email',
    authenticate({ required: true }),
    [check('email', 'Email must be valid if present').isEmail()],
    checkErrors,
    userRouter.changeUserEmail.bind(userRouter)
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
    userRouter.changeUserPassword.bind(userRouter)
  )
  users.delete(
    '/me',
    authenticate({ required: true }),
    userRouter.deleteUser.bind(userRouter)
  )
  users.get('/:id', userRouter.getUserById.bind(userRouter))
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
    userRouter.registerUser.bind(userRouter)
  )

  users.post(
    '/auth',
    [
      check('username', 'A username is required').exists(),
      check('password', 'A password is required').exists()
    ],
    checkErrors,
    userRouter.authorizeUser.bind(userRouter)
  )

  return users
}

const configQuizzes = (userRepository, quizRepository) => {
  const quizController = new QuizController(userRepository, quizRepository)
  const quizRouter = new QuizRouter(quizController)

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
    authenticate({ required: false }),
    quizRouter.getQuiz.bind(quizRouter)
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
    quizRouter.createQuiz.bind(quizRouter)
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
    quizRouter.editQuiz.bind(quizRouter)
  )

  quizzes.delete(
    '/:id',
    authenticate({ required: true }),
    quizRouter.deleteQuiz.bind(quizRouter)
  )

  return quizzes
}

const configResults = (resultRepository, userRepository, quizRepository) => {
  const resultController = new ResultController(
    resultRepository,
    userRepository,
    quizRepository
  )
  const resultRouter = new ResultRouter(resultController)

  const results = express.Router()
  results.use(debugRequests(debug('routes:result')))

  results.get(
    '/',
    [
      query('format', 'Valid formats: listing, full')
        .custom(format => format === 'listing' || format === 'full')
        .optional(),
      query('quiz', 'Quiz id is required').exists(),
      query('user', 'User id is required').exists()
    ],
    checkErrors,
    authenticate({ required: true }),
    resultRouter.getResult.bind(resultRouter)
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
    resultRouter.postResult.bind(resultRouter)
  )
  return results
}

exports.config = db => {
  let userRepository
  let quizRepository

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

  return {
    users: configUsers(userRepository, quizRepository),
    quizzes: configQuizzes(userRepository, quizRepository),
    results: configResults(resultRepository, userRepository, quizRepository)
  }
}
