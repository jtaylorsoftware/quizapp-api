import { bootstrap, NextFunction, Request, Response } from 'express-di'

import { App } from 'app'

import DbService from 'services/db'

import QuizControllerV2 from 'controllers/v2/quiz'
import ResultControllerV2 from 'controllers/v2/result'
import UserControllerV2 from 'controllers/v2/user'

import QuizRepository from 'repositories/quiz'
import ResultRepository from 'repositories/result'
import UserRepository from 'repositories/user'

import QuizServiceV2 from 'services/v2/quiz'
import ResultServiceV2 from 'services/v2/result'
import UserServiceV2 from 'services/v2/user'
import { ServiceError } from 'services/v2/errors'

export default async function () {
  const app = <App>(
    await bootstrap(
      App,
      [QuizControllerV2, ResultControllerV2, UserControllerV2],
      [
        DbService,

        UserRepository,
        QuizRepository,
        ResultRepository,

        UserServiceV2,
        QuizServiceV2,
        ResultServiceV2,
      ]
    )
  )

  // TODO Integrate into express-di
  app.ex.use(serviceErrorHandler)
  app.ex.use(errorHandler)

  const client = app.dbClient
  return { app: app.ex, client, config: app.config }
}

const debug = require('debug')('middleware:errorHandler')

// TODO Integrate into express-di
function serviceErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  debug(`${req.method.toUpperCase()} ${req.path} => ${err.stack}`)
  if (err instanceof ServiceError) {
    res.status(err.code).end()
  } else {
    next(err)
  }
}

// Generic handler
function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(500).end()
}
