if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

import { createServer } from 'http'
import { createTerminus, TerminusOptions } from '@godaddy/terminus'

import bootstrap from './bootstrap-app'

bootstrap()
  .then(({ app, client: mongoClient, config }) => {
    // Express app should now be configured, routes set up, and connected to MongoDB

    // Get port from env or default
    let port = (() => {
      const DEFAULT_PORT = 8080
      const envPort = Number.parseInt(process.env.PORT ?? '')
      return Number.isNaN(envPort) ? DEFAULT_PORT : envPort
    })()

    // Callbacks for terminus
    async function onSignal() {
      console.log('server received shutdown signal')
      await mongoClient.close()
    }

    async function onShutdown() {
      console.log('server is shutting down')
      return Promise.resolve()
    }

    async function onHealthCheck() {
      return 'OK'
    }

    // Set up healthcheck endpoint and signal handlers
    const options: Partial<TerminusOptions> = {
      healthChecks: {
        '/healthcheck': onHealthCheck,
        verbatim: true,
      },
      signals: ['SIGINT', 'SIGTERM'],
      onSignal,
      onShutdown,
    }
    const server = createServer(app)
    createTerminus(server, options)

    // Start serving requests
    server.listen(port, () => {
      console.log(`Application${config?.name ? ' ' + config?.name : ''} started on port ${port}`)
    })
  })
  .catch((err) => console.error('Error starting server:\n', err))
