import { body } from 'express-validator'
import moment from 'moment'

import { Question, Answer, MultipleChoiceAnswer } from 'models/questiontypes'

import * as userValidation from './user'

export function isValidExpiration(expirationDateStr: string) {
  return (
    moment(expirationDateStr).isValid() &&
    moment().diff(moment(expirationDateStr)) < 0
  )
}

export const checkExpiration = body(
  'expiration',
  'Expiration must be a date and time in the future',
).custom(isValidExpiration)

export function isValidTitle(title?: string) {
  return title != null && title.length > 0
}

export const checkTitle = body('title', 'Title can\'t be empty')
  .isString()
  .custom(isValidTitle)

export const checkIsPublic = body(
  'isPublic',
  'Public setting must be a boolean',
).isBoolean()

export function allowedUsersAreValid(allowedUsers: string[]) {
  return allowedUsers.every(user => userValidation.isValidUsername(user))
}

export const checkAllowedUsers = body(
  'allowedUsers',
  'Allowed users must be an array of usernames',
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
  answerCount: number,
) => {
  const correctAnswer: number = Number.parseInt(answerStr)
  return (
    !isNaN(correctAnswer) && correctAnswer < answerCount && correctAnswer >= 0
  )
}

export function isValidAnswerText(text: string) {
  return text.length > 0
}

export function isValidAnswer(answer: Answer) {
  switch (typeof answer) {
    case 'object':
      return isValidAnswerText((answer as Partial<MultipleChoiceAnswer>)?.text ?? '')
    case 'string':
      return isValidAnswerText(answer ?? '')
  }
  return false
}

export function answersAreValid(answers: MultipleChoiceAnswer[]) {
  return answers.length >= MIN_ANSWER_COUNT
}

export function isValidQuestionBody(question?: Partial<Question>): boolean {
  if (question == null) {
    throw Error('Invalid question value')
  }

  if (!(question.text != null && isValidQuestionText(question.text ?? ''))) {
    throw Error('One or more questions has empty question text')
  }

  // Allow undefined, in which case assume MC
  question.type ??= 'MultipleChoice'

  switch (question.type) {
    case 'FillIn':
      if (!(question.correctAnswer != null && question.correctAnswer.length > 0)) {
        throw Error('One or more questions has empty answer text')
      }
      return true
    case 'MultipleChoice':
      if (question.answers != null) {
        if (!answersAreValid(question.answers)) {
          throw Error('One or more questions has too few answers')
        }
        if (!question.answers.every(isValidAnswer)) {
          throw Error('One or more questions has empty answer text')
        }
      } else {
        throw Error('One or more questions has too few answers')
      }

      if (!(question.correctAnswer != null && isValidCorrectAnswer(
        question.correctAnswer as unknown as string,
        question.answers.length))
      ) {
        throw Error('One or more question has an answer index that is out of range')
      }

      return true
  }
}

export const checkQuestions = body('questions').custom(questions => {
  if (!(questions instanceof Array)) {
    throw Error('Questions must be an array')
  }
  if (questions.length < 1) {
    throw Error('There must be at least one question')
  }

  return questions.every((q: Partial<Question>) => isValidQuestionBody(q))
})
