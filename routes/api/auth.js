const { check } = require('express-validator')
const { checkErrors } = require('../../middleware/validaton/checkerrors')
const { UserRepository } = require('../../repositories/user')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

let userRepository

const router = require('express').Router()

router.post(
  '/',
  [
    check('username', 'A username is required').exists(),
    check('password', 'A password is required').exists()
  ],
  checkErrors,
  async (req, res) => {
    const { username, password } = req.body

    try {
      // try to find a user with a matching email
      const user = await userRepository.findByUsername(username)
      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] })
      }

      // check if the password matches the user's password
      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] })
      }

      // the jwt will contain the user's id
      const payload = {
        user: {
          id: user._id
        }
      }

      // use jwt to sign the payload with the secret
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: 3600 * 24 },
        (error, token) => {
          if (error) {
            throw error
          }
          res.json({ token })
        }
      )
    } catch (error) {
      console.error(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
  }
)

exports.authRouter = db => {
  // only initialize once
  if (!userRepository) {
    db.collection('user', (error, collection) => {
      if (error) {
        throw error
      }
      userRepository = new UserRepository(collection)
    })
  }
  return router
}
