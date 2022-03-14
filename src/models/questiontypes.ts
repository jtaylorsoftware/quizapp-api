export interface MultipleChoiceAnswer {
  text: string
}

export type FillInAnswer = string

export type Answer = MultipleChoiceAnswer | FillInAnswer

export type FillInType = 'FillIn'
export type MultipleChoiceType = 'MultipleChoice'
export type QuestionType = FillInType | MultipleChoiceType

export interface MultipleChoiceQuestion {
  type: 'MultipleChoice'

  // The accompanying text that describes the problem a Question wants to be answered.
  text: string

  // The index of the correct answer.
  correctAnswer: number

  // All the possible choices
  answers: MultipleChoiceAnswer[]
}

export interface FillInQuestion {
  type: 'FillIn'

  // The accompanying text that describes the problem a Question wants to be answered.
  text: string

  // The expected answer text
  correctAnswer: FillInAnswer
}

export type Question = FillInQuestion | MultipleChoiceQuestion
