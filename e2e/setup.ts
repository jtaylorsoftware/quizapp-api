import Quiz from 'models/quiz'
import Result from 'models/result'
import User from 'models/user'
import { MongoClient } from 'mongodb'

require('dotenv').config()

export default async () => {
  const client = new MongoClient(process.env.DB_URL as string)
  await client.connect()
  const db = await client.db()
  await db.createCollection<User>('users')
  await db.createCollection<Quiz>('quizzes')
  await db.createCollection<Result>('results')

  //@ts-ignore
  global.__MONGO__ = client
}
