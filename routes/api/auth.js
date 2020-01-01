const { check } = require('express-validator')
const { checkErrors } = require('../../middleware/checkerrors')
const { UserRepository } = require('../../repositories/user')
const auth = require('../../middleware/auth')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const omit = require('object.omit')

let userRepository

const router = require('express').Router()

router.get('/', auth, async (req, res) => {
  try {
    const user = await userRepository.findById(req.user._id)
    res.json(user)
  } catch (error) {
    console.error(error.message)
    res.status(500).send({ errors: [{ msg: 'Internal server error ' }] })
  }
})

router.post(
  '/',
  [
    check('email', 'A valid email is required').isEmail(),
    check('password', 'A password is required').exists()
  ],
  checkErrors,
  async (req, res) => {
    const { email, password } = req.body

    try {
      // try to find a user with a matching email
      const user = userRepository.findByEmail(email)
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
      console.error(error.message)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
  }
)
