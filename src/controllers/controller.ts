import ServiceLocator from '../services/servicelocator'
import { Request, Response, Router } from 'express'
import debugRequests from '../middleware/logging'

export abstract class Controller {
  private _router: Router
  constructor(protected serviceLocator: ServiceLocator) {
    this.serviceLocator = serviceLocator
    this._router = Router()

    // Set up route debug logging if enabled
    if (this['debugName']) {
      this._router.use(
        debugRequests(require('debug')('routes:' + this['debugName']))
      )
    }
    // Set up express route handlers per http method
    const methods: any[] = this['methods'] || []
    for (const method of Object.getOwnPropertyNames(methods)) {
      for (const handler of methods[method]) {
        const { url, before, callback, after } = handler
        this._router[method](url, before, callback.bind(this), after)
      }
    }
  }
  get router(): Router {
    return this._router
  }
}

interface ControllerConfig {
  debugName: string
}

export function Config({ debugName }: ControllerConfig) {
  return (constructor: Function) => {
    constructor.prototype.debugName = debugName
  }
}

interface Middleware {
  (req: Request, res: Response, next: (_: any) => void)
}

/**
 * Registers a route handler for a certain Http method along with related middleware
 * @param method http method to map to
 * @param url route endpoint
 * @param before middleware to apply before the decorated handler
 * @param after middleware to apply after the decorated handler
 */
const registerRouteHandler = (
  method: string,
  url: string,
  before?: Middleware[],
  after?: Middleware[]
) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const func = descriptor.value
    const middleware = {
      before: [],
      callback: null,
      after: []
    }
    if (before) {
      middleware.before.push(before)
    }
    middleware.callback = func
    if (after) {
      middleware.after.push(after)
    }
    if (!target.hasOwnProperty('methods')) {
      Object.defineProperty(target, 'methods', {
        enumerable: true,
        value: { get: [], put: [], post: [], delete: [] }
      })
    }
    target['methods'][method].push({ url, ...middleware })
  }
}

/**
 * Route decorator for Get method
 */
export function Get(url: string, before?: Middleware[], after?: Middleware[]) {
  return registerRouteHandler('get', url, before, after)
}

/**
 * Route decorator for Put method
 */
export function Put(url: string, before?: Middleware[], after?: Middleware[]) {
  return registerRouteHandler('put', url, before, after)
}

/**
 * Route decorator for Post method
 */
export function Post(url: string, before?: Middleware[], after?: Middleware[]) {
  return registerRouteHandler('post', url, before, after)
}

/**
 * Route decorator for Delete method
 */
export function Delete(
  url: string,
  before?: Middleware[],
  after?: Middleware[]
) {
  return registerRouteHandler('delete', url, before, after)
}
