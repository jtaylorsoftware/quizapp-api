import { App } from 'app'
import QuizController from 'controllers/quiz'
import ResultController from 'controllers/result'
import UserController from 'controllers/user'
import { bootstrap } from 'express-di'
import QuizRepository from 'repositories/quiz'
import ResultRepository from 'repositories/result'
import UserRepository from 'repositories/user'
import DbService from 'services/db'
import QuizService from 'services/quiz'
import ResultService from 'services/result'
import UserService from 'services/user'

export default async function () {
  const app = <App>(
    await bootstrap(
      App,
      [QuizController, ResultController, UserController],
      [
        DbService,
        UserRepository,
        QuizRepository,
        ResultRepository,
        UserService,
        QuizService,
        ResultService
      ]
    )
  )
  const client = app.dbClient
  return { app: app.ex, client, config: app.config }
}
