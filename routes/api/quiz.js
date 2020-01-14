const quizValidators = require('../../middleware/validation/quiz')
const { checkErrors } = require('../../middleware/checkerrors')
const { UserRepository } = require('../../repositories/user')
const { QuizRepository } = require('../../repositories/quiz')
const { Quiz } = require('../../models/quiz')
const { authenticate } = require('../../middleware/auth')

const omit = require('object.omit')

let userRepository
let quizRepository

const router = require('express').Router()

/**
 * GET /
 * Returns all public quizzes
 */
router.get('/', async (req, res) => {
  try {
    const quizzes = await quizRepository.getAllPublicQuizzes()
    res.json(quizzes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
  }
})

const getRequestedQuiz = async (req, res, next) => {
  try {
    const quiz = await quizRepository.findById(req.params.id)
    if (!quiz) {
      return res
        .status(404)
        .json({ errors: [{ msg: 'There is no matching quiz found' }] })
    }
    req.quiz = quiz
    next()
  } catch (error) {
    console.error(error)
    res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
  }
}

const canViewQuiz = (id, quiz) =>
  quiz.isPublic ||
  quiz.user.toString() === id ||
  !quiz.allowedUsers.some(userId => userId.toString() === id)

/**
 * GET /:id
 * Returns a public quiz by id or a private one if user is authenticated & allowed to
 */
router.get(
  '/:id',
  authenticate({ required: false }),
  getRequestedQuiz,
  async (req, res) => {
    const { quiz, user } = req
    if (user) {
      if (!canViewQuiz(user.id, quiz)) {
        return res.status(403).json({
          errors: [{ msg: 'You are not allowed to view this quiz' }]
        })
      }
    } else if (!quiz.isPublic) {
      return res.status(401).json({
        errors: [{ msg: 'You must be logged in to view this quiz' }]
      })
    }
    res.json(req.quiz)
  }
)

/**
 * GET /:id
 * Returns just the question from the quiz
 */
router.get(
  '/:id/questions',
  authenticate({ required: false }),
  // [
  //   query('page', 'Page must be at least 1').isInt({ min: 1 }),
  //   query('size', 'Size must be at least 1')
  //     .optional()
  //     .isInt({ min: 1 })
  // ],
  // checkErrors,
  getRequestedQuiz,
  async (req, res) => {
    const { quiz, user } = req
    if (user) {
      if (!canViewQuiz(user.id, quiz)) {
        return res.status(403).json({
          errors: [{ msg: 'You are not allowed to view this quiz' }]
        })
      }
    } else if (!quiz.isPublic) {
      return res.status(401).json({
        errors: [{ msg: 'You must be logged in to view this quiz' }]
      })
    }

    const { questions } = req.quiz
    // const page = req.query.page
    // const DEFAULT_PAGESIZE = 10
    // const size = req.query.size || DEFAULT_PAGESIZE

    // const start = (page - 1) * size
    // const end = Math.min(start + size, questions.length)
    // if (start >= questions.length) {
    //   return res.status(404).json({
    //     errors: [{ msg: `Could not get page ${page}` }]
    //   })
    // }

    // res.json(questions.slice(start, end))
    res.json(questions)
  }
)

/**
 * POST /
 * Saves a quiz to db
 */
router.post(
  '/',
  authenticate({ required: false }),
  [
    quizValidators.checkQuizTitle,
    quizValidators.checkPublic,
    quizValidators.checkExpiresIn,
    // quizValidators.checkAllowedUsers,
    quizValidators.checkQuestions
  ],
  checkErrors,
  async (req, res) => {
    const userId = req.user.id || null // if undefined, will set to null
    const { title, allowedUsers, isPublic, questions } = req.body
    const expiresIn = new Date(req.body.expiresIn)
    try {
      const allowedUserIds = []
      for (const username of allowedUsers) {
        const user = await userRepository.findByUsername(username)
        if (user) {
          allowedUserIds.push(user._id)
        } else {
          return res.status(400).json({
            errors: [
              {
                location: 'body',
                param: 'allowedUsers',
                msg: `${username} does not exist`
              }
            ]
          })
        }
      }
      // console.log(isPublic, allowedUsers, allowedUserIds)

      const quiz = await quizRepository.insert(
        new Quiz(userId, title, expiresIn, isPublic, questions, allowedUserIds)
      )

      await userRepository.addQuiz(userId, quiz)
      res.status(200).json({ id: quiz._id })
    } catch (error) {
      console.error(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
  }
)

/**
 * DELETE /:id
 * Deletes a quiz by id if authenticated and owns the quiz
 */
router.delete(
  '/:id',
  authenticate({ required: true }),
  getRequestedQuiz,
  quizValidators.requireQuizOwner,
  async (req, res) => {
    const { quiz } = req
    const userId = req.user.id
    try {
      await quizRepository.delete(quiz)
      await userRepository.removeQuiz(userId, quiz)
      res.status(204).end()
    } catch (error) {
      console.error(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
  }
)

/**
 * PUT /:id/title
 * Changes the quiz title
 */
router.put(
  '/:id/title',
  authenticate({ required: true }),
  getRequestedQuiz,
  quizValidators.requireQuizOwner,
  [quizValidators.checkQuizTitle],
  checkErrors,
  async (req, res) => {
    const { quiz } = req
    const { title } = req.body
    try {
      await quizRepository.updateTitle(quiz, title)
      res.status(204).end()
    } catch (error) {
      console.error(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
  }
)

/**
 * PUT /:id/questions/:questionIndex/text
 * Change the text for a question
 */
router.put(
  '/:id/questions/:questionIndex/text',
  authenticate({ required: true }),
  getRequestedQuiz,
  quizValidators.requireQuizOwner,
  [quizValidators.checkQuestionIndex, quizValidators.checkQuestionText],
  checkErrors,
  async (req, res) => {
    const { text } = req.body
    const { quiz } = req
    const questionIndex = Number.parseInt(req.params.questionIndex)
    if (questionIndex >= quiz.questions.length) {
      return res.status(404).json({
        errors: [
          {
            msg: 'questionIndex out of bounds',
            location: 'params',
            param: 'questionIndex'
          }
        ]
      })
    }
    try {
      await quizRepository.updateQuestionText(quiz, questionIndex, text)
      res.status(204).end()
    } catch (error) {
      console.error(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
  }
)

/**
 * PUT /:id/questions/:questionIndex/answers/:answerIndex/text
 * Change the text for an answer to a question
 */
router.put(
  '/:id/questions/:questionIndex/answers/:answerIndex/text',
  authenticate({ required: true }),
  getRequestedQuiz,
  quizValidators.requireQuizOwner,
  [
    quizValidators.checkQuestionIndex,
    quizValidators.checkAnswerIndex,
    quizValidators.checkAnswerText
  ],
  checkErrors,
  async (req, res) => {
    const { text } = req.body
    const { quiz } = req
    const questionIndex = Number.parseInt(req.params.questionIndex)
    const answerIndex = Number.parseInt(req.params.answerIndex)
    if (questionIndex >= quiz.questions.length) {
      return res.status(404).json({
        errors: [
          {
            msg: 'questionIndex out of bounds',
            location: 'params',
            param: 'questionIndex'
          }
        ]
      })
    }
    if (answerIndex >= quiz.questions[questionIndex].answers.length) {
      return res.status(404).json({
        errors: [
          {
            msg: 'answerIndex out of bounds',
            location: 'params',
            param: 'questionIndex'
          }
        ]
      })
    }
    try {
      await quizRepository.updateQuestionAnswerText(
        quiz,
        questionIndex,
        answerIndex,
        text
      )
      res.status(204).end()
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
