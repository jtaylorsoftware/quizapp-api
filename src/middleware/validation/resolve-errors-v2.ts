import { validationResult, ValidationError } from 'express-validator'
import { Request, Response, NextFunction } from 'express'

function errorFormatter(error: ValidationError) {
  if (error.type === 'field') {
    return {
      field: error.path,
      message: error.msg,
      value: error.value,
    }
  } else {
    return {
      field: null,
      message: error.msg,
      value: null,
    }
  }
}

export default function (req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req).formatWith(errorFormatter)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  return next()
}
