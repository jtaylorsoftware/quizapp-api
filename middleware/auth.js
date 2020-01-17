const jwt = require('jsonwebtoken')

const verifyToken = async token => {
  let user = {}
  await jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (!error) {
      user = decoded.user
    }
  })
  return user
}

exports.authenticate = options => async (req, res, next) => {
  const token = req.header('x-auth-token')
  try {
    const user = await verifyToken(token)
    if (!user && options.required) {
      res.status(401).json({ errors: [{ msg: 'Authorization denied' }] })
    } else {
      req.user = user
      return next()
    }
  } catch (error) {
    console.error('Error in JWT authorization middleware\n', error.message)
    res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
  }
}
