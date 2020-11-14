if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

import express from 'express'
import path from 'path'

import bootstrap from './bootstrap-app'

bootstrap().then(({ app, client, config }) => {
  const PORT = Number.parseInt(process.env.PORT)
  const name =
    (config?.name && 'Application "' + config.name + '"') || 'Application'

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'))
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../client', 'build', 'index.html'))
    })
  }

  app.listen(PORT, () => {
    console.log(`${name} started on port ${PORT}`)
  })
})
