import { FillInType, MultipleChoiceType } from './questiontypes'

// An ungraded answer to a FillInQuestion (sent in user request)
export interface FillInAnswer {
  type: FillInType

  // The supplied answer text
  answer: string
}

// An ungraded answer to a MultipleChoiceQuestion (sent in user request)
export interface MultipleChoiceAnswer {
  type: MultipleChoiceType

  // The supplied index of the chosen answer
  choice: number
}

export type Answer = MultipleChoiceAnswer | FillInAnswer

// A graded FillInAnswer (a Result response)
export interface FillInGradedAnswer {
  type: FillInType

  // The supplied answer text
  answer: string

  // The actual answer, may exclude to not send as part of Result
  correctAnswer?: string

  // The actual answer, may exclude to not indicate if the Result is graded
  isCorrect?: boolean
}

// A graded MultipleChoiceAnswer (a Result response)
export interface MultipleChoiceGradedAnswer {
  type: MultipleChoiceType

  // The supplied index of the chosen answer
  choice: number

  // The actual answer, may exclude to not send as part of Result
  correctAnswer?: number

  // The actual answer, may exclude to not indicate if the Result is graded
  isCorrect?: boolean
}

export type GradedAnswer = MultipleChoiceGradedAnswer | FillInGradedAnswer