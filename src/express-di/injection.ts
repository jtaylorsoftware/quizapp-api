import DefaultMap from './defaultmap'
import { Constructor } from './common'

/**
  Marks a class as needing dependency injection. A class
  that requires injected properties in its constructor
  must be decorated with at least Inject.
 */
export function Inject(_: Constructor) {}

export function DisableInjection<T extends { new (...args: any): {} }>(
  target: T
): T {
  Object.defineProperty(target.prototype, 'noinject', {
    enumerable: true
  })
  return target
}

function resolveDependencies(
  target: Constructor,
  dependencies: DefaultMap<string, Set<string>>
) {
  if (dependencies.has(target.name)) return
  dependencies.set(target.name, new Set<string>())
  const targetDependencies =
    Reflect.getMetadata('design:paramtypes', target) || []

  for (const dep of targetDependencies) {
    // Check if the dep returned by Reflect.getMetadata is undefined | null, indicating circular dependency.
    // (Reflect.getMetadata seems to pick up circular dependencies on its own with any number of intermediate nodes)
    if (dep == null) {
      throw new Error(
        `Could not get metadata for ${target.name} - possible circular dependency exists involving ${target.name}'s dependencies.`
      )
    }

    // Check if noinject type is being used as a dependency
    if ('noinject' in dep.prototype) {
      throw new TypeError(
        `Cannot use noinject types as dependencies (${target.name} -> _${dep.name}_).`
      )
    }

    dependencies.get(target.name).add(dep.name)
    resolveDependencies(dep, dependencies)
  }
}

export function resolveDependencyGraph(targets: Set<Constructor>) {
  const dependencies = new DefaultMap<string, Set<string>>(
    () => new Set<string>()
  )
  targets.forEach(target => resolveDependencies(target, dependencies))

  return dependencies
}

function injectImpl(target: Constructor, cache: {}) {
  if (cache.hasOwnProperty(target.name)) {
    return cache
  }

  // Get dependencies of the target
  const params = Reflect.getMetadata('design:paramtypes', target) || []

  // Get dependencies of the target's dependencies
  const injections = params.map((param: any) => {
    if (param == null) {
      throw new Error('Null parameter received for dependency injection.')
    }
    cache = injectImpl(param, cache)
    return cache[param.name]
  })
  return {
    [target.name]: new target(...injections),
    ...cache
  }
}

export function inject(target: Constructor, cache: {}) {
  return injectImpl(target, { ...cache })
}
