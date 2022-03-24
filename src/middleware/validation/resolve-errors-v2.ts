import { validationResult, ValidationError } from 'express-validator'
import { Request, Response, NextFunction } from 'express'

function errorFormatter({ msg, param, value }: ValidationError) {
  return {
    field: param,
    message: msg,
    value: value,
  }
}

export default function (req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req).formatWith(errorFormatter)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  return next()
}
