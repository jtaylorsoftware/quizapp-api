const jwt = require('jsonwebtoken')

module.exports = async (req, res, next) => {
  const token = req.header('x-auth-token')

  if (!token) {
    return res.status(401).json({ msg: 'Authorization denied' })
  }

  try {
    await jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
      if (error) {
        res.status(401).json({ msg: 'Authorization denied' })
      } else {
        req.user = decoded.user
        next()
      }
    })
  } catch (error) {
    console.error('Error in JWT authorization middleware\n', error.message)
    res.status(500).json({ msg: 'Internal server error' })
  }
}
