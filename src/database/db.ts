import { Db, MongoClient } from 'mongodb'

export interface DbConfig {
  url: string
}

export interface DbConnection {
  client: MongoClient
  db: Db
}

export default async function (config: DbConfig): Promise<DbConnection> {
  const client = new MongoClient(config.url)
  await client.connect()
  return { client, db: client.db() }
}
