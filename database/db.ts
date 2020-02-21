import { MongoClient } from 'mongodb'

interface DbConfig {
  url: string
}

export default async function(config: DbConfig) {
  const client = await MongoClient.connect(config.url, {
    useUnifiedTopology: true,
    useNewUrlParser: true
  })
  return { client, db: client.db() }
}
