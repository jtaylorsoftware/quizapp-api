import { Collection, Db, MongoClient } from 'mongodb'
import { Inject, Service } from 'express-di'
import connectToDb from 'database/db'

@Inject
export default class DbService extends Service() {
  quizzes: Collection<any>
  users: Collection<any>
  results: Collection<any>
  client: MongoClient
  db: Db
  async onInit() {
    const { client, db } = await connectToDb({ url: process.env.DB_URL })
    this.client = client
    this.db = db
    this.quizzes = db.collection('quizzes')
    this.users = db.collection('users')
    this.results = db.collection('results')
  }
}
