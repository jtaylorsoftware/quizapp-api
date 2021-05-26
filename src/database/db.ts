import { Db, MongoClient } from 'mongodb'

export interface DbConfig {
  url: string
}

export interface DbConnection {
  client: MongoClient
  db: Db
}

export default async function (config: DbConfig): Promise<DbConnection> {
  const client = await MongoClient.connect(config.url, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  return { client, db: client.db() }
}
