import { body } from 'express-validator'

interface ResultAnswer {
  choice: number
}
export function answersAreValid(answers: ResultAnswer[]) {
  return answers.every(
    ans => typeof ans === 'object' && typeof ans.choice === 'number'
  )
}
export const checkAnswers = body(
  'answers',
  "Answers must be an array of objects with one numeric property 'choice'"
)
  .isArray()
  .custom(answersAreValid)
