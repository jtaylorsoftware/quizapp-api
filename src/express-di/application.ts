import express, { Express } from 'express'
import helmet from 'helmet'
import { DisableInjection } from './injection'
import { RequestHandler, Route } from './route'

export interface ApplicationConfig {
  name?: string
}

export interface ApplicationBase {
  readonly ex: Express
  readonly config?: ApplicationConfig
}

export default function Application(config?: ApplicationConfig) {
  class _ApplicationInternal implements ApplicationBase {
    ex = express()
    config = config
    constructor() {
      this.ex.use(helmet())
      this.ex.use(express.json())
      this.ex.use((error, req, res, next) => {
        if (error instanceof SyntaxError) {
          res.status(400).json({ errors: [{ msg: 'Invalid JSON format' }] })
        } else {
          return next()
        }
      })
    }
  }
  Object.defineProperty(_ApplicationInternal.prototype, 'routes', {
    value: new Array<RequestHandler>()
  })
  Object.defineProperty(_ApplicationInternal.prototype, 'bindRoutes', {
    value: function <T extends _ApplicationInternal>(instance: T) {
      instance['routes'].forEach((route: Route) => {
        const boundCallbacks = route.callbacks.map(cb => cb.bind(instance))
        instance.ex[route.method](route.url, boundCallbacks)
      })
    }
  })
  return DisableInjection(_ApplicationInternal)
}
