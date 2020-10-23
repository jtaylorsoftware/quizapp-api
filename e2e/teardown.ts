import mongo from 'mongodb'

export default async () => {
  //@ts-ignore
  const client: mongo.MongoClient = global.__MONGO__
  const db = await client.db()
  await db.collection('users').drop()
  await db.collection('quizzes').drop()
  await db.collection('results').drop()
  await client.close()
}
