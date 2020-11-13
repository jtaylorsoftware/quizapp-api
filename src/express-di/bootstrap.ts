import 'reflect-metadata'
import { ApplicationBase } from './application'
import { Constructor } from './common'
import { ControllerBase } from './controller'
import DefaultMap from './defaultmap'
import { inject, resolveDependencyGraph } from './injection'
import { ServiceBase } from './service'

type Client = ApplicationBase | ServiceBase | ControllerBase

interface ClientCache {
  [index: string]: Client
}

function injectAll(dependencies: Set<Constructor<Client>>): ClientCache {
  let cache: ClientCache = {}
  dependencies.forEach(Dep => {
    cache = inject(Dep, cache)
  })
  return cache
}

async function initImpl(
  client: string,
  clientCache: ClientCache,
  dependencyGraph: DefaultMap<string, Set<string>>,
  initializedClients: Set<string>
): Promise<Set<string>> {
  if (initializedClients.has(client)) {
    return initializedClients
  }

  // Initialize client's dependencies
  const dependencies = dependencyGraph.get(client)
  if (dependencies.size > 0) {
    for (const dependency of dependencies) {
      initializedClients = await initImpl(
        dependency,
        clientCache,
        dependencyGraph,
        initializedClients
      )
    }
  }

  // Initialize client
  const instance: Client & { onInit?: Function } = clientCache[client]
  if (instance.onInit) {
    const result = instance.onInit()
    if (result instanceof Promise) {
      await result
    }
  }

  return new Set<string>(initializedClients).add(client)
}

async function init(
  clientCache: ClientCache,
  dependencyGraph: DefaultMap<string, Set<string>>
) {
  let initializedClients = new Set<string>()

  for (const entry of dependencyGraph) {
    const clientName = entry[0]

    initializedClients = await initImpl(
      clientName,
      clientCache,
      dependencyGraph,
      initializedClients
    )
  }

  if (Object.keys(clientCache).length !== initializedClients.size) {
    throw new Error('Not all clients could be initialized')
  }
}

function bindRoutes(
  application: ApplicationBase,
  controllers: ControllerBase[]
) {
  // Bind application first so it takes priority over controllers
  ;(application['bindRoutes'] as Function)(application)

  controllers.forEach(controller => {
    ;(controller['bindRoutes'] as Function)(controller)
    application.ex.use(controller.config?.root ?? '', controller.router)
  })
}

function isController(t: Client): t is ControllerBase {
  return 'router' in t
}

export default async function bootstrap<
  ApplicationType extends Constructor<ApplicationBase>,
  ControllerType extends Constructor<ControllerBase>,
  ServiceType extends Constructor<ServiceBase>
>(
  Application: ApplicationType,
  controllers?: ControllerType[],
  services?: ServiceType[]
): Promise<ApplicationBase> {
  const dependencies = new Set<Constructor<Client>>([
    Application,
    ...(services ?? []),
    ...(controllers ?? [])
  ])
  // Instantiate/inject all dependencices
  const clientCache = injectAll(dependencies)
  const app: ApplicationBase = clientCache[Application.name] as ApplicationBase

  // Resolve order for onInit
  const dependencyGraph = resolveDependencyGraph(dependencies)

  // Call onInit for all dependencies and app
  await init(clientCache, dependencyGraph)

  // Bind app and controller routes
  bindRoutes(app, Object.values(clientCache).filter(isController))

  return app
}
