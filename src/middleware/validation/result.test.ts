import { Answer, FillInAnswer, MultipleChoiceAnswer } from '../../models/answertypes'

jest.mock('./result')
import { answerIsValid, answersAreValid as mockAnswersAreValid } from './result'

describe('result (answer) validators', () => {
  describe('answersAreValid', () => {
    const { answersAreValid } = jest.requireActual('./result')
    const mockAnswerIsValid = jest.mocked(answerIsValid)

    beforeEach(() => {
      mockAnswerIsValid.mockReset()
      mockAnswerIsValid.mockReturnValue(true)
    })

    it('should throw on non-array values', () => {
      expect(answersAreValid.bind(null)).toThrow('must be an array')
      expect(answersAreValid.bind(null, {} as unknown as Partial<Answer>[])).toThrow('must be an array')
    })

    it('should throw on empty array', () => {
      expect(answersAreValid.bind(null, [])).toThrow('must have at least one')
    })

    it('should return result of validating every answer', () => {
      const answers: Answer[] = [
        {
          type: 'MultipleChoice',
          choice: 0,
        },
      ]
      answersAreValid(answers)
      expect(mockAnswerIsValid).toHaveBeenCalled()
    })
  })

  describe('answerIsValid', () => {
    const { answerIsValid } = jest.requireActual('./result')

    let validFillInAnswer: FillInAnswer
    let validMcAnswer: MultipleChoiceAnswer

    beforeEach(() => {
      validFillInAnswer = {
        type: 'FillIn',
        answer: 'Answer',
      }
      validMcAnswer = {
        type: 'MultipleChoice',
        choice: 0,
      }
    })

    it('should pass a valid FillIn answer', () => {
      expect(answerIsValid(validFillInAnswer)).toBeTruthy()
    })

    it('should throw on a FillIn answer with missing or invalid text', () => {
      let invalid = {
        ...validFillInAnswer,
        answer: '',
      }
      expect(answerIsValid.bind(null, invalid)).toThrow('must not be empty')
      invalid.answer = undefined
      expect(answerIsValid.bind(null, invalid)).toThrow('must not be empty')
    })

    it('should pass a valid MC answer', () => {
      expect(answerIsValid(validMcAnswer)).toBeTruthy()
    })

    it('should throw on a MC answer with missing or non-numeric choice', () => {
      let invalid = {
        ...validMcAnswer,
        choice: -1,
      }
      expect(answerIsValid.bind(null, invalid)).toThrow('must be a number')
      invalid.choice = undefined
      expect(answerIsValid.bind(null, invalid)).toThrow('must be a number')
    })
  })
})