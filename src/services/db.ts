import { Collection, Db, MongoClient } from 'mongodb'
import { Inject, Service } from 'express-di'
import connectToDb, { DbConnection } from 'database/db'
import Quiz from 'models/quiz'
import User from 'models/user'
import Result from 'models/result'

async function tryConnectToDb(): Promise<DbConnection> {
  let attempts = 1
  let error: any
  while (attempts <= 3) {
    try {
      return await connectToDb({ url: process.env.DB_URL as string })
    } catch (err) {
      error = err
      console.error(`(${attempts}) Could not connect to mongodb: ${error}`)
    }
    attempts += 1
  }
  // Throw the latest error after failing all attempts
  throw error
}

@Inject
export default class DbService extends Service() {
  quizzes!: Collection<Quiz>
  users!: Collection<User>
  results!: Collection<Result>
  client!: MongoClient
  db!: Db
  async onInit() {
    const { client, db } = await tryConnectToDb()
    this.client = client
    this.db = db
    this.quizzes = db.collection('quizzes')
    this.users = db.collection('users')
    this.results = db.collection('results')
  }
}
