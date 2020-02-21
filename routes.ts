import { Db } from 'mongodb'

const { UserRepository } = require('./repositories/user')
const { QuizRepository } = require('./repositories/quiz')
const { ResultRepository } = require('./repositories/result')

const { UserService } = require('./services/user')
const { QuizService } = require('./services/quiz')
const { ResultService } = require('./services/result')

const { ServiceLocator } = require('./services/servicelocator')

const { configUserRoute } = require('./routes/user')
const { configQuizRoute } = require('./routes/quiz')
const { configResultRoute } = require('./routes/result')

export const config = (db: Db) => {
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
    users: configUserRoute(serviceLocator),
    quizzes: configQuizRoute(serviceLocator),
    results: configResultRoute(serviceLocator)
  }
}
