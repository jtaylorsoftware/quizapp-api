import { Request, Response, NextFunction } from 'express'
export { Request, Response, NextFunction } from 'express'

export type RequestHandler =
  | ((req: Request, res: Response, next: NextFunction) => void)
  | ((req: Request, res: Response) => void)

export interface Route {
  method: string
  url: string
  callbacks: RequestHandler[]
}

function registerRoute(
  method: string,
  url: string,
  before?: RequestHandler[],
  after?: RequestHandler[]
): MethodDecorator {
  return function <RequestHandler>(
    target: any,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<RequestHandler>
  ) {
    if (!('routes' in target)) {
      throw TypeError('Target prototype cannot use routing')
    }

    target['routes'].push({
      method,
      url,
      callbacks: [...(before ?? []), descriptor.value, ...(after ?? [])]
    })
  }
}

export function Get(
  url: string,
  before?: RequestHandler[],
  after?: RequestHandler[]
) {
  return registerRoute('get', url, before, after)
}

export function Post(
  url: string,
  before?: RequestHandler[],
  after?: RequestHandler[]
) {
  return registerRoute('post', url, before, after)
}

export function Put(
  url: string,
  before?: RequestHandler[],
  after?: RequestHandler[]
) {
  return registerRoute('put', url, before, after)
}

export function Head(
  url: string,
  before?: RequestHandler[],
  after?: RequestHandler[]
) {
  return registerRoute('head', url, before, after)
}

export function Delete(
  url: string,
  before?: RequestHandler[],
  after?: RequestHandler[]
) {
  return registerRoute('delete', url, before, after)
}

export function All(
  url: string,
  before?: RequestHandler[],
  after?: RequestHandler[]
) {
  return registerRoute('all', url, before, after)
}
