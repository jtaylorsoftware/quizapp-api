const { body } = require('express-validator')

const answersAreValid = answers =>
  answers.every(
    ans => typeof ans === 'object' && typeof ans.choice === 'number'
  )

const checkAnswers = body(
  'answers',
  "Answers must be an array of objects with one numeric property 'choice'"
)
  .isArray()
  .custom(answersAreValid)

module.exports = {
  checkAnswers
}
