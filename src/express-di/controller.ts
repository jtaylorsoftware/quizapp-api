import { Router, RouterOptions } from 'express'
import { DisableInjection } from './injection'
import { RequestHandler, Route } from './route'

export interface ControllerConfig {
  root?: string
  routerOptions?: RouterOptions
}

export interface ControllerBase {
  readonly router: Router
  readonly config?: ControllerConfig
}

export default function Controller(config?: ControllerConfig) {
  class _ControllerInternal implements ControllerBase {
    router = Router(config?.routerOptions)
    config = config
  }
  Object.defineProperty(_ControllerInternal.prototype, 'routes', {
    value: new Array<RequestHandler>()
  })
  Object.defineProperty(_ControllerInternal.prototype, 'bindRoutes', {
    value: function <T extends _ControllerInternal>(instance: T) {
      instance['routes'].forEach((route: Route) => {
        const boundCallbacks = route.callbacks.map(cb => cb.bind(instance))
        instance.router[route.method](route.url, boundCallbacks)
      })
    }
  })

  return DisableInjection(_ControllerInternal)
}
