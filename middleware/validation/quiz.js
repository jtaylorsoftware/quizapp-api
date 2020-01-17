const { QuizRepository } = require('../../repositories/quiz')

const { body, param } = require('express-validator')

exports.checkQuizTitle = body(
  'title',
  'Quiz must have a non-empty title'
).custom(value => typeof value === 'string' && value.length > 0)

exports.checkPublic = body(
  'isPublic',
  'Must set a value for public'
).isBoolean()
exports.checkExpiresIn = body(
  'expiresIn',
  'expiresIn must be a valid date'
).isISO8601({ strict: true })
exports.checkAllowedUsers = body(
  'allowedUsers',
  'Allowed users must be empty array or only contain user IDs'
).custom(
  value =>
    (value && value instanceof Array && value.length === 0) ||
    QuizRepository.validateAllowedUsers(value)
)

exports.checkQuestionIndex = param(
  'questionIndex',
  'questionIndex must be a positive integer'
).isInt({
  min: 0
})

exports.checkQuestions = body(
  'questions',
  'Questions must be a valid array of question objects'
)
  .isArray()
  .custom(values => values.every(q => QuizRepository.validateQuestion(q)))

exports.checkQuestionText = body('text', 'Text must not be empty')
  .isString()
  .isLength({ min: 1 })

exports.checkAnswerText = body('text', 'Text must not be empty')
  .isString()
  .isLength({ min: 1 })

exports.checkAnswerIndex = param(
  'answerIndex',
  'answerIndex must be a positive integer'
).isInt({
  min: 0
})
