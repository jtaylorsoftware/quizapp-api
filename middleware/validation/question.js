const { QuestionRepository } = require('../../repositories/question')

const { body, param } = require('express-validator')

exports.checkQuestions = body(
  'questions',
  'Questions must be a valid array of question objects'
)
  .isArray()
  .custom(values => values.every(q => QuestionRepository.validateQuestion(q)))

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
