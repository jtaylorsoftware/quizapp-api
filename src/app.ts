import { MongoClient } from 'mongodb'

import { Inject, Application } from 'express-di'
import DbService from 'services/db'

@Inject
export class App extends Application({
  name: 'QuizApp',
  helmetOptions: {
    contentSecurityPolicy: false,
  },
  corsConfig: {
    origin: process.env.NODE_ENV == 'production' ? 'http://www.makequizzes.online' : '*'
  }
}) {
  dbClient!: MongoClient
  constructor(private db: DbService) {
    super()
  }

  onInit() {
    this.dbClient = this.db.client
  }
}
