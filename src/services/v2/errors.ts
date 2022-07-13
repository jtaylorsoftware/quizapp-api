// Common error type used by Services returned when some function fails in a predictable way.
export type ValidationError = {
  // The name causing the error, or null for a general error.
  field?: string

  // If field is a collection, contains the index in the collection.
  index?: number

  // Associated message describing the error.
  message?: string

  // The value that caused the error, or null if a general error or the value is omitted for security.
  value?: any

  // If applicable, the expected value for this field.
  expected?: any
}

/**
 * An Error type thrown by Services when processing of a request
 * could absolutely not continue.
 */
export class ServiceError extends Error {
  constructor(public code: number, public reason?: string) {
    super(`status: ${code}, reason: ${reason ?? 'could not process request'}`)
    this.name = this.constructor.name
  }
}
