const { MongoClient } = require('mongodb')

interface DbConfig {
  url: string
}

export async function connectToDb(config: DbConfig) {
  const client = await MongoClient.connect(config.url, {
    useUnifiedTopology: true,
    useNewUrlParser: true
  })
  return { client, db: client.db() }
}
