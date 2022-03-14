import { body } from 'express-validator'
import { Answer } from '../../models/answertypes'
import * as thisModule from './result'

export function answerIsValid(answer: Partial<Answer>): boolean {
  if (!(answer instanceof Object)) {
    throw Error('Invalid answer value')
  }

  // Allow undefined, in which case assume MC
  answer.type = answer.type ?? 'MultipleChoice'

  switch (answer.type) {
    case 'FillIn':
      if (answer.answer == null || answer.answer.length === 0) {
        throw Error('Answer text must not be empty')
      }
      return true
    case 'MultipleChoice':
      if (answer.choice == null || answer.choice < 0) {
        throw Error('Answer choice must be a number')
      }
      return true
  }
}

export function answersAreValid(answers?: Partial<Answer>[]) {
  if (!(answers instanceof Array)) {
    throw Error('Answers must be an array')
  }

  if (answers.length == 0) {
    throw Error('Answers must have at least one value')
  }

  return answers.every(thisModule.answerIsValid)
}
export const checkAnswers = body(
  'answers',
)
  .isArray()
  .custom(answersAreValid)
