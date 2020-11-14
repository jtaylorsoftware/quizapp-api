import { MongoClient } from 'mongodb'

import { Inject, Application } from 'express-di'
import DbService from 'services/db'

@Inject
export class App extends Application({ name: 'QuizApp' }) {
  dbClient: MongoClient
  constructor(private db: DbService) {
    super()
  }

  onInit() {
    this.dbClient = this.db.client
  }
}
