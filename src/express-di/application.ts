import express, { Express } from 'express'
import helmet, { HelmetOptions } from 'helmet'
import { DisableInjection } from './injection'
import { RequestHandler, Route } from './route'
import cors, { CorsOptions, CorsOptionsDelegate } from 'cors'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yaml'
import fs from 'fs'

export type OpenApiConfig = {
  path: string
  documentPath: string
}

export interface ApplicationConfig {
  name?: string
  helmetOptions?: Readonly<HelmetOptions>
  corsConfig?: CorsOptions | CorsOptionsDelegate
  openApi?: OpenApiConfig
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
      this.ex.use(helmet(config?.helmetOptions))
      this.ex.use(cors(config?.corsConfig))
      this.ex.use(express.json())

      if (config?.openApi != null) {
        try {
          const document = YAML.parse(
            fs.readFileSync(config.openApi.documentPath, 'utf8')
          )
          this.ex.use(
            config.openApi.path,
            swaggerUi.serve,
            swaggerUi.setup(document)
          )
        } catch (err) {
          console.error(
            `Could not open OpenAPI document ${config.openApi.documentPath}: `,
            err
          )
        }
      }

      // @ts-ignore
      this.ex.use((error, req, res, next) => {
        // noinspection SuspiciousTypeOfGuard
        if (error instanceof SyntaxError) {
          res.status(400).json({ errors: [{ message: 'Invalid JSON format' }] })
        } else {
          return next()
        }
      })
    }
  }

  Object.defineProperty(_ApplicationInternal.prototype, 'routes', {
    value: new Array<RequestHandler>(),
  })
  Object.defineProperty(_ApplicationInternal.prototype, 'bindRoutes', {
    value: function <T extends _ApplicationInternal>(instance: T) {
      // @ts-ignore
      instance['routes'].forEach((route: Route) => {
        const boundCallbacks = route.callbacks.map((cb) => cb.bind(instance))
        // @ts-ignore
        instance.ex[route.method](route.url, boundCallbacks)
      })
    },
  })
  return DisableInjection(_ApplicationInternal)
}
