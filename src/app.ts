import { MongoClient } from 'mongodb'

import { Application, Inject, OpenApiConfig } from 'express-di'
import DbService from 'services/db'
import path from 'path'

const openApiOptions: OpenApiConfig | undefined =
  process.env.NODE_ENV !== 'production'
    ? {
        path: '/openapi',
        documentPath: path.resolve('openapi', 'swagger.yaml'),
      }
    : undefined

@Inject
export class App extends Application({
  name: 'QuizApp',
  helmetOptions: {
    contentSecurityPolicy: false,
  },
  corsConfig: {
    origin:
      process.env.NODE_ENV == 'production' ? process.env.ALLOWED_ORIGIN : '*',
  },
  openApi: openApiOptions,
}) {
  // Stored in App so that bootstrap can return this reference easily to main
  dbClient!: MongoClient

  constructor(private db: DbService) {
    super()
  }

  onInit() {
    this.dbClient = this.db.client
  }
}
