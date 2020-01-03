const { check } = require('express-validator')
const { checkErrors } = require('../../middleware/checkerrors')
const { UserRepository } = require('../../repositories/user')
const { QuizRepository } = require('../../repositories/quiz')
const { User } = require('../../models/user')
const { Quiz } = require('../../models/quiz')
const { authenticate } = require('../../middleware/auth')

const omit = require('object.omit')

let userRepository
let quizRepository

const checkQuestionText = check('text', 'Question must have a non-empty text')
  .isString()
  .isLength({ min: 1 })
const checkPublic = check('isPublic', 'Must set a value for public').isBoolean()
const checkExpiresIn = check(
  'expiresIn',
  'expiresIn must be an integer >= 0'
).isInt({ min: 0 })
const checkUser = check(
  'user',
  'User creating quiz must be null or a user ID'
).custom(value => value == null || QuizRepository.validateUser(value))
const checkAllowedUsers = check(
  'allowedUsers',
  'Allowed users must be null or empty or only contain user IDs'
).custom(
  value =>
    value == null ||
    (value instanceof Array && value.length === 0) ||
    QuizRepository.validateAllowedUsers(value)
)
const checkQuestions = check(
  'questions',
  'Questions must be a valid array of question objects'
).custom(value => QuizRepository.validateQuestions(value))

const router = require('express').Router()

router.get('/', async (req, res) => {
  try {
    const quizzes = await quizRepository.getAllPublicQuizzes()
    console.log(quizzes)
    res.json(quizzes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
  }
})

router.post(
  '/',
  [
    checkQuestionText,
    checkPublic,
    checkExpiresIn,
    checkUser,
    checkAllowedUsers,
    checkQuestions
  ],
  checkErrors,
  authenticate({ required: false }),
  async (req, res) => {
    const {
      user,
      text,
      allowedUsers,
      questions,
      isPublic,
      expiresIn
    } = req.body

    try {
      await quizRepository.insert(
        new Quiz(user, text, questions, allowedUsers, expiresIn, isPublic)
      )
      res.status(200).end()
    } catch (error) {
      console.error(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
  }
)

exports.quizRouter = db => {
  // only initialize once
  if (!userRepository) {
    db.collection('user', (error, collection) => {
      if (error) {
        throw error
      }
      userRepository = new UserRepository(collection)
    })
  }
  if (!quizRepository) {
    db.collection('quiz', (error, collection) => {
      if (error) {
        throw error
      }
      quizRepository = new QuizRepository(collection)
    })
  }
  return router
}
