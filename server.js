const debug = require('debug')('server')
const express = require('express')

const routes = require('./routes')

const { connectToDb } = require('./database/db')

/**
 * Starts the server
 * @param {Number} port Port that server will listen on
 */
exports.startServer = async port => {
  const { db } = await connectToDb({ url: process.env.DB_URL })
  console.log('Connected to Mongodb')

  const app = express()

  app.use(express.json({ extended: false }))
  app.use((error, req, res, next) => {
    if (error instanceof SyntaxError) {
      res.status(400).json({ errors: [{ msg: 'Invalid JSON format' }] })
    } else {
      debug(error)
      return next()
    }
  })

  const { users, quizzes, results } = routes.config(db)

  app.use('/api/users', users)
  app.use('/api/quizzes', quizzes)
  // app.use('/api/results', results)

  app.server = app.listen(port)

  return app
}
