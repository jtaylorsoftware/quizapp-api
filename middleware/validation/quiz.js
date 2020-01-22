const { body } = require('express-validator')
const moment = require('moment')

const userValidation = require('./user')

const isValidExpiration = expirationDateStr =>
  moment(expirationDateStr).isValid() &&
  moment().diff(moment(expirationDateStr)) < 0

const checkExpiration = body(
  'expiresIn',
  'Expiration must be a date and time in the future'
).custom(isValidExpiration)

const isValidTitle = title => title.length > 0

const checkTitle = body('title', "Title can't be empty")
  .isString()
  .custom(isValidTitle)

const checkIsPublic = body(
  'isPublic',
  'Public setting must be a boolean'
).isBoolean()

const allowedUsersAreValid = allowedUsers =>
  allowedUsers.every(user => userValidation.isValidUsername(user))

const checkAllowedUsers = body(
  'allowedUsers',
  'Allowed users must be an array of usernames'
)
  .isArray()
  .custom(allowedUsersAreValid)
  .optional()

const isValidQuestionText = text => text.length > 0

const MIN_ANSWER_COUNT = 2

const isValidCorrectAnswer = (correctAnswer, answerCount) => {
  correctAnswer = Number.parseInt(correctAnswer)
  return (
    !isNaN(correctAnswer) && correctAnswer < answerCount && correctAnswer >= 0
  )
}

const isValidAnswerText = text => text.length > 0

const isValidAnswer = answer =>
  typeof answer === 'object' && isValidAnswerText(answer.text)

const answersAreValid = answers =>
  answers instanceof Array && answers.length >= MIN_ANSWER_COUNT

// const isValidQuestion = question =>
//   isValidQuestionText(question.text) &&
//   isValidCorrectAnswer(question.correctAnswer, question.answers.length) &&
//   answersAreValid(question.answers)

const checkQuestions = body('questions').custom(questions => {
  if (!(questions instanceof Array)) {
    throw Error('Questions must be an array')
  }
  if (questions.length < 1) {
    throw Error('There must be at least one question')
  }
  if (!questions.every(q => isValidQuestionText(q.text))) {
    throw Error('One or more questions has empty question text')
  }
  if (!questions.every(q => answersAreValid(q.answers))) {
    throw Error('One or more questions has too few answers')
  }
  if (!questions.every(q => q.answers.every(isValidAnswer))) {
    throw Error('One or more questions has empty answer text')
  }
  if (
    !questions.every(q =>
      isValidCorrectAnswer(q.correctAnswer, q.answers.length)
    )
  ) {
    throw Error('One or more question has an answer index that is out of range')
  }

  return true
})

module.exports = {
  checkExpiration,
  checkTitle,
  checkIsPublic,
  checkAllowedUsers,
  checkQuestions
}
