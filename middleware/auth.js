const jwt = require('jsonwebtoken')

module.exports = async (req, res, next) => {
  const token = req.header('x-auth-token')

  if (!token) {
    return res.status(401).json({ errors: [{ msg: 'Authorization denied' }] })
  }

  try {
    await jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
      if (error) {
        return res
          .status(401)
          .json({ errors: [{ msg: 'Authorization denied' }] })
      } else {
        req.user = decoded.user
        next()
      }
    })
  } catch (error) {
    console.error('Error in JWT authorization middleware\n', error.message)
    res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
  }
}
