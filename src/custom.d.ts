import { Payload } from 'middleware/auth'

declare global {
  namespace Express {
    export interface Request {
      user?: Payload
    }
  }
}
