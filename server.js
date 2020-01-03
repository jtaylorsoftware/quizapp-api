const express = require('express')

/**
 * Starts the server
 * @param {Number} port Port that server will listen on
 * @param {[{string, Router}]} routes Array of base router URL strings and associated express.Router
 * @returns {Express} Express application object with server property containing result of listen()
 */
exports.startServer = (port, routes) => {
  const app = express()

  app.use(express.json({ extended: false }))
  app.use((error, req, res, next) => {
    if (error instanceof SyntaxError) {
      res.status(400).json({ errors: [{ msg: 'Invalid JSON format' }] })
    } else {
      next()
    }
  })

  routes.forEach(route => {
    app.use(route.path, route.router)
  })

  app.server = app.listen(port)

  return app
}
