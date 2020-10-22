import { Db } from 'mongodb'

import UserRepository from '../repositories/user'
import QuizRepository from '../repositories/quiz'
import ResultRepository from '../repositories/result'

import UserService from '../services/user'
import QuizService from '../services/quiz'
import ResultService from '../services/result'

import ServiceLocator from '../services/servicelocator'

import UserController from './user'
import QuizController from './quiz'
import ResultController from './result'

export default function(db: Db) {
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
    users: new UserController(serviceLocator),
    quizzes: new QuizController(serviceLocator),
    results: new ResultController(serviceLocator)
  }
}
