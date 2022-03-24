import { bootstrap } from 'express-di'

import { App } from 'app'

import DbService from 'services/db'

import QuizControllerV1 from 'controllers/v1/quiz'
import ResultControllerV1 from 'controllers/v1/result'
import UserControllerV1 from 'controllers/v1/user'

import QuizControllerV2 from 'controllers/v2/quiz'
import ResultControllerV2 from 'controllers/v2/result'
import UserControllerV2 from 'controllers/v2/user'

import QuizRepository from 'repositories/quiz'
import ResultRepository from 'repositories/result'
import UserRepository from 'repositories/user'

import QuizServiceV1 from 'services/v1/quiz'
import ResultServiceV1 from 'services/v1/result'
import UserServiceV1 from 'services/v1/user'

import QuizServiceV2 from 'services/v2/quiz'
import ResultServiceV2 from 'services/v2/result'
import UserServiceV2 from 'services/v2/user'

export default async function () {
  const app = <App>(
    await bootstrap(
      App,
      [
        QuizControllerV1,
        ResultControllerV1,
        UserControllerV1,

        QuizControllerV2,
        ResultControllerV2,
        UserControllerV2,
      ],
      [
        DbService,

        UserRepository,
        QuizRepository,
        ResultRepository,

        UserServiceV1,
        QuizServiceV1,
        ResultServiceV1,

        UserServiceV2,
        QuizServiceV2,
        ResultServiceV2,
      ]
    )
  )
  const client = app.dbClient
  return { app: app.ex, client, config: app.config }
}
