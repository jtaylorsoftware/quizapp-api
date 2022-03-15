import { FillInQuestion, MultipleChoiceQuestion } from '../../models/questiontypes'
import { isValidQuestionBody } from './quiz'

describe('quiz validators', () => {
  describe('isValidQuestionBody', () => {
    let validMcQuestion: MultipleChoiceQuestion
    let validFillInQuestion: FillInQuestion

    beforeEach(() => {
      validMcQuestion = {
        type: 'MultipleChoice',
        text: 'Question',
        correctAnswer: 0,
        answers: [
          {
            text: 'One',
          },
          {
            text: 'Two',
          },
        ],
      }

      validFillInQuestion = {
        type: 'FillIn',
        text: 'Question',
        correctAnswer: 'Answer',
      }
    })

    it('should pass a correctly formatted FillIn Question', () => {
      expect(isValidQuestionBody(validFillInQuestion)).toBeTruthy()
    })

    it('should throw on a FillIn Question with empty answer', () => {
      let invalid = {
        ...validFillInQuestion,
        correctAnswer: '',
      }
      expect(isValidQuestionBody.bind(null, invalid)).toThrow('empty answer text')
      // @ts-ignore
      invalid.correctAnswer = undefined
      expect(isValidQuestionBody.bind(null, invalid)).toThrow('empty answer text')
    })

    it('should pass a correctly formatted MC Question', () => {
      expect(isValidQuestionBody(validMcQuestion)).toBeTruthy()
    })

    it('should assume undefined type as MC Question, and pass it', () => {
      // @ts-ignore
      validMcQuestion.type = undefined
      expect(isValidQuestionBody(validMcQuestion)).toBeTruthy()
    })

    it('should throw on incomplete questions', () => {
      expect(isValidQuestionBody.bind(null, {})).toThrow()
    })

    it('should throw error when missing text', () => {
      const invalid = {
        ...validMcQuestion,
        text: undefined,
      }
      expect(isValidQuestionBody.bind(null, invalid)).toThrow('empty question text')
    })

    it('should throw error when mc question answers are empty', () => {
      let invalid = {
        ...validMcQuestion,
        answers: [],
      }
      expect(isValidQuestionBody.bind(null, invalid)).toThrow('too few answers')
      // @ts-ignore
      invalid.answers = undefined
      expect(isValidQuestionBody.bind(null, invalid)).toThrow('too few answers')
    })

    it('should throw error when any mc question answer.text are empty', () => {
      let invalid = {
        ...validMcQuestion,
        answers: [{
          text: 'text',
        }, {
          text: undefined,
        }],
      }
      // @ts-ignore
      expect(isValidQuestionBody.bind(null, invalid)).toThrow('empty answer text')
    })

    it('should throw error when MC correctAnswer is negative', () => {
      const invalid = {
        ...validMcQuestion,
        correctAnswer: -1,
      }
      expect(isValidQuestionBody.bind(null, invalid)).toThrow('out of range')
    })
  })
})