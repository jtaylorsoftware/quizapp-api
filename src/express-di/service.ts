export interface ServiceConfig {}

export interface ServiceBase {
  readonly config?: ServiceConfig
}

export default function Service(config?: ServiceConfig) {
  return class implements ServiceBase {
    config = config
  }
}
