if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

import express from 'express'
import path from 'path'

import bootstrap from './bootstrap-app'

bootstrap()
  .then(({ app, client, config }) => {
    const DEFAULT_PORT = 8080
    let port = Number.parseInt(process.env.PORT)
    port = port == NaN ? DEFAULT_PORT : port
    const name =
      (config?.name && 'Application "' + config.name + '"') || 'Application'

    if (process.env.NODE_ENV === 'production') {
      app.use(express.static('client/build'))
      app.get('*', (req, res) => {
        res.sendFile(
          path.resolve(__dirname, '../client', 'build', 'index.html')
        )
      })
    }

    app.listen(port, () => {
      console.log(`${name} started on port ${port}`)
    })
  })
  .catch((err) => console.error('Error starting server:\n', err))
