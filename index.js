if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const { startServer } = require('./server')
const { userRouter } = require('./routes/api/user')
const { authRouter } = require('./routes/api/auth')
const { quizRouter } = require('./routes/api/quiz')

const { connectToDb } = require('./database/db')

const start = async () => {
  const { db } = await connectToDb({ url: process.env.DB_URL })
  console.log('Connected to Mongodb')
  // db.collection('user', (err, collection) => {
  //   if (error) {
  //     throw error
  //   }
  //   routes.push({ path: '/user', router: userRouter(collection) })
  //   routes.push({ })
  // })

  await startServer(process.env.PORT, [
    { path: '/api/user', router: userRouter(db) },
    { path: '/api/auth', router: authRouter(db) },
    { path: '/api/quiz', router: quizRouter(db) }
  ])
}

start()
  .then(() => console.log(`Server started`))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
