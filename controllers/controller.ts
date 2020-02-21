import { ServiceLocator } from '../services/servicelocator'

export abstract class Controller {
  constructor(protected serviceLocator: ServiceLocator) {
    this.serviceLocator = serviceLocator
  }
}
