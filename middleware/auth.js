const debug = require('debug')('middleware:auth')
const jwt = require('jsonwebtoken')

const verifyToken = token => {
  let user = null
  if (token) {
    try {
      debug('verifying user token')
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      user = payload.user
    } catch (error) {
      debug('verify token error: ', error)
    }
  }

  return user
}

exports.authenticate = options => async (req, res, next) => {
  const token = req.header('x-auth-token')
  debug('authenticating user')
  const user = verifyToken(token)
  debug(user ? `user token received: ${user.id}` : 'no user token')
  if (!user && options.required) {
    res.status(401).json({ errors: [{ msg: 'Authorization denied' }] })
  } else {
    req.user = user
    return next()
  }
}
