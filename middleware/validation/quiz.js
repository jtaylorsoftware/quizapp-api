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
  'Allowed users must be null or empty or only contain user IDs'
).custom(
  value =>
    value == null ||
    (value instanceof Array && value.length === 0) ||
    QuizRepository.validateAllowedUsers(value)
)

exports.checkQuestionIndex = param(
  'questionIndex',
  'questionIndex must be a positive integer'
).isInt({
  min: 0
})

exports.requireQuizOwner = async (req, res, next) => {
  if (req.quiz.user.toString() !== req.user.id) {
    return res
      .status(403)
      .json({ errors: [{ msg: 'You are not the owner of this quiz' }] })
  }
  next()
}
