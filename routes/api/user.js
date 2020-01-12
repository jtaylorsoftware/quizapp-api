const { check } = require('express-validator')
const { checkErrors } = require('../../middleware/checkerrors')
const { UserRepository } = require('../../repositories/user')
const { User } = require('../../models/user')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { authenticate } = require('../../middleware/auth')
const omit = require('object.omit')

let userRepository

const router = require('express').Router()

router.get('/me', authenticate({ required: true }), async (req, res) => {
  try {
    const user = await userRepository.findById(req.user.id)
    res.json(omit(user, 'password'))
  } catch (error) {
    console.error(error)
    res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
  }
})

router.put(
  '/me',
  authenticate({ required: true }),
  [
    check('email', 'Email must be valid if present')
      .isEmail()
      .optional(),
    check('password', 'Password must be 8 characters if present')
      .custom(value => typeof value === 'string' && value.length >= 8)
      .optional()
  ],
  checkErrors,
  async (req, res) => {
    const user = req.user.id
    const { email, password } = req.body
    try {
      if (email) {
        await userRepository.updateEmail(user, email)
      }
      if (password) {
        await userRepository.updatePassword(user, password)
      }
      res.status(204).end()
    } catch (error) {
      console.error(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
  }
)

router.get('/:username', async (req, res) => {
  try {
    const user = await userRepository.findByUsername(req.params.username)
    if (!user) {
      return res
        .status(404)
        .json({ errors: [{ msg: 'There is no matching user found' }] })
    }
    res.json(omit(user, ['email', 'password']))
  } catch (error) {
    console.error(error)
    res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
  }
})

router.post(
  '/',
  [
    check('username', 'Username is required')
      .notEmpty()
      .not()
      .equals('me'),
    check('email', 'A valid email is required').isEmail(),
    check(
      'password',
      'A password with 8 or more characters is required'
    ).custom(value => typeof value === 'string' && value.length >= 8)
  ],
  checkErrors,
  async (req, res) => {
    const { username, email, password } = req.body

    try {
      let existingUser = await userRepository.findByEmail(email)
      if (existingUser) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Email is already in use' }] })
      }
      existingUser = await userRepository.findByUsername(username)
      if (existingUser) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Username is already in use' }] })
      }

      let user = new User(username, email, password)

      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(password, salt)

      user = await userRepository.insert(user)

      const payload = {
        user: {
          id: user._id
        }
      }

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

exports.userRouter = db => {
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
