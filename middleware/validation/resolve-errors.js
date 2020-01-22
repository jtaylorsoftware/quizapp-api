const { errorFormatter } = require('./formatter')
const { validationResult } = require('express-validator')

exports.resolveErrors = (req, res, next) => {
  const errors = validationResult(req).formatWith(errorFormatter)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  return next()
}
