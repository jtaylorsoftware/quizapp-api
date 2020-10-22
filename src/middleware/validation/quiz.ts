import { body } from 'express-validator'
import moment from 'moment'

import * as userValidation from './user'

export function isValidExpiration(expirationDateStr: string) {
  return (
    moment(expirationDateStr).isValid() &&
    moment().diff(moment(expirationDateStr)) < 0
  )
}

export const checkExpiration = body(
  'expiration',
  'Expiration must be a date and time in the future'
).custom(isValidExpiration)

export function isValidTitle(title: string) {
  return title.length > 0
}

export const checkTitle = body('title', "Title can't be empty")
  .isString()
  .custom(isValidTitle)

export const checkIsPublic = body(
  'isPublic',
  'Public setting must be a boolean'
).isBoolean()

export function allowedUsersAreValid(allowedUsers: string[]) {
  return allowedUsers.every(user => userValidation.isValidUsername(user))
}

export const checkAllowedUsers = body(
  'allowedUsers',
  'Allowed users must be an array of usernames'
)
  .isArray()
  .custom(allowedUsersAreValid)
  .optional()

export function isValidQuestionText(text: string) {
  return text.length > 0
}

export const MIN_ANSWER_COUNT = 2

export const isValidCorrectAnswer = (
  answerStr: string,
  answerCount: number
) => {
  const correctAnswer: number = Number.parseInt(answerStr)
  return (
    !isNaN(correctAnswer) && correctAnswer < answerCount && correctAnswer >= 0
  )
}

export function isValidAnswerText(text: string) {
  return text.length > 0
}

interface QuizAnswer {
  text: string
}
export function isValidAnswer(answer: QuizAnswer) {
  return typeof answer === 'object' && isValidAnswerText(answer.text)
}

export function answersAreValid(answers: QuizAnswer[]) {
  return answers instanceof Array && answers.length >= MIN_ANSWER_COUNT
}

// const isValidQuestion = question =>
//   isValidQuestionText(question.text) &&
//   isValidCorrectAnswer(question.correctAnswer, question.answers.length) &&
//   answersAreValid(question.answers)

export const checkQuestions = body('questions').custom(questions => {
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
