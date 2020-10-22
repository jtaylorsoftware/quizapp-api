import { validationResult, ValidationError } from 'express-validator'

function errorFormatter({ msg, param, value }: ValidationError) {
  return { [param]: msg, value: value }
}

export default function(req, res, next) {
  const errors = validationResult(req).formatWith(errorFormatter)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  return next()
}
