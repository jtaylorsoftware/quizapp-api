import * as http from 'http'

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

import express from 'express'
import path from 'path'
import { createTerminus, TerminusOptions } from '@godaddy/terminus'

import bootstrap from './bootstrap-app'

async function onSignal () {
  console.log('server is starting cleanup')
}

async function onShutdown () {
  console.log('cleanup finished, server is shutting down');
}

async function onHealthCheck () {
  return 'OK'
}

bootstrap()
  .then(({ app, client, config }) => {
    const DEFAULT_PORT = 8080
    let port = Number.parseInt(process.env.PORT)
    port = Number.isNaN(port) ? DEFAULT_PORT : port
    const name =
      (config?.name && 'Application "' + config.name + '"') || 'Application'

    const server = http.createServer(app)

    const options: Partial<TerminusOptions> = {
      healthChecks: {
        '/healthcheck': onHealthCheck,
        verbatim: true,
      },
      signals: ['SIGINT', 'SIGTERM'],
      onSignal,
      onShutdown
    }

    createTerminus(server, options)

    server.listen(port, () => {
      console.log(`${name} started on port ${port}`)
    })
  })
  .catch((err) => console.error('Error starting server:\n', err))
