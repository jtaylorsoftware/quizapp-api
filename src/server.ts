const debug = require('debug')('server')
import express from 'express'
import path from 'path'
import helmet from 'helmet'
import connectToDb from './database/db'

import configControllers from './controllers/config'

export const configApp = async () => {
  const { client, db } = await connectToDb({ url: process.env.DB_URL })
  // console.log('Connected to Mongodb')

  const app = express()
  app.use(helmet())

  app.use(express.json())
  app.use((error, req, res, next) => {
    if (error instanceof SyntaxError) {
      res.status(400).json({ errors: [{ msg: 'Invalid JSON format' }] })
    } else {
      debug(error)
      return next()
    }
  })

  const { users, quizzes, results } = configControllers(db)

  app.use('/api/users', users.router)
  app.use('/api/quizzes', quizzes.router)
  app.use('/api/results', results.router)

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'))
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../client', 'build', 'index.html'))
    })
  }
  return { client, app }
}

/**
 * Starts the server
 * @param port Port that server will listen on
 */
export default async function async(port: number) {
  const { app } = await configApp()

  app.listen(port)
}
