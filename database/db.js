const { MongoClient } = require('mongodb')

exports.connectToDb = async config => {
  const client = await MongoClient.connect(config.url, {
    useUnifiedTopology: true,
    useNewUrlParser: true
  })
  return { client, db: client.db() }
}
