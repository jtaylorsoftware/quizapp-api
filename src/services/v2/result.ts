import async from 'async'

import ResultRepository from 'repositories/result'
import Result from 'models/result'
import { Inject, Service } from 'express-di'
import { ObjectId } from 'mongodb'
import Quiz from 'models/quiz'
import {
  Answer,
  FillInGradedAnswer,
  GradedAnswer,
  MultipleChoiceGradedAnswer,
} from 'models/answertypes'
import { FillInQuestion, MultipleChoiceQuestion } from 'models/questiontypes'
import { ServiceError } from 'services/v2/errors'

@Inject
export default class ResultServiceV2 extends Service() {
  constructor(private resultRepository: ResultRepository) {
    super()
  }

  async getResult(resultId: ObjectId): Promise<Result | null> {
    return await this.resultRepository.repo.findById(resultId)
  }

  async deleteResult(resultId: ObjectId): Promise<void> {
    await this.resultRepository.repo.delete(resultId)
  }

  async getUserResultForQuiz(
    userId: string | ObjectId,
    quizId: string | ObjectId
  ) {
    return await this.resultRepository.findByUserAndQuizId(userId, quizId)
  }

  /**
   * Attempt to grade a Quiz and persist it as a Result.
   * @param answers Ungraded answers to a Quiz
   * @param userId user submitting answers
   * @param quiz Quiz being answered
   */
  async createResult(
    answers: Answer[],
    userId: string,
    quiz: Quiz
  ): Promise<[ObjectId | null, ServiceError[]]> {
    const errors: ServiceError[] = []

    if (!ObjectId.isValid(userId)) {
      errors.push({
        field: 'userId',
        message: 'userId does not represent a valid id',
        value: userId,
      })
      return [null, errors]
    }

    // Check to see if this would be the user's second time responding
    if (!quiz.allowMultipleResponses) {
      // This is a valid use of async.some - with no callback supplied it returns Promise
      // noinspection JSVoidFunctionReturnValueUsed
      const duplicateResult: any /* boolean */ = await async.some(
        quiz.results,
        async (resultId: ObjectId) => {
          const result = <Result>(
            await this.resultRepository.repo.findById(resultId)
          )
          return result && result.user.equals(userId)
        }
      )

      if (duplicateResult) {
        errors.push({
          message: 'You already responded to this quiz.',
        })
        return [null, errors]
      }
    }

    // Ensure same number of response answers as questions
    const questions = quiz.questions
    if (answers.length !== questions.length) {
      errors.push({
        field: 'answers',
        message: `Answers length must equal questions length. Expected ${questions.length}.`,
        value: answers.length,
        expected: questions.length,
      })
      return [null, errors]
    }

    // Grade all the questions
    const gradedAnswers: GradedAnswer[] = []
    let score = 0
    for (let i = 0; i < questions.length; ++i) {
      const question = questions[i]
      question.type ??= 'MultipleChoice'

      const answer = answers[i]
      answer.type ??= 'MultipleChoice'

      // Ensure that the response answer is for this question type
      if (question.type != answer.type) {
        errors.push({
          field: 'answers',
          message: `Answer type does not match Question type. Expected ${question.type}`,
          index: i,
          value: answer.type,
          expected: question.type,
        })
        continue
      }

      // Grade the question depending on its type
      switch (answer.type) {
        case 'FillIn':
          if (answer.answer.length === 0) {
            errors.push({
              field: 'answers',
              message: `Answer text must not be empty.`,
              index: i,
              value: answer.answer.length,
            })
          } else {
            const gradedAnswer: FillInGradedAnswer = {
              type: 'FillIn',
              answer: answer.answer,
            }
            gradedAnswer.isCorrect =
              (question as FillInQuestion).correctAnswer === answer.answer
            if (gradedAnswer.isCorrect) {
              score += 1 / questions.length
            }
            gradedAnswers.push(gradedAnswer)
          }
          break
        case 'MultipleChoice':
          if (
            answer.choice >=
              (question as MultipleChoiceQuestion).answers.length ||
            answer.choice < 0
          ) {
            errors.push({
              field: 'answers',
              message: `Answer choice must be between 0 and ${
                (question as MultipleChoiceQuestion).answers.length
              }`,
              index: i,
              value: answer.choice,
            })
          } else {
            const gradedAnswer: MultipleChoiceGradedAnswer = {
              type: 'MultipleChoice',
              choice: answer.choice,
            }

            const correctAnswer = (question as MultipleChoiceQuestion)
              .correctAnswer
            gradedAnswer.isCorrect = correctAnswer === answer.choice
            if (gradedAnswer.isCorrect) {
              score += 1 / questions.length
            }
            if (quiz.showCorrectAnswers) {
              gradedAnswer.correctAnswer = correctAnswer
            }

            gradedAnswers.push(gradedAnswer)
          }
      }
    }
    if (errors.length === 0) {
      const resultId = await this.resultRepository.repo.insert(
        new Result(
          new ObjectId(userId),
          quiz._id as ObjectId,
          quiz.user,
          gradedAnswers,
          score
        )
      )
      return [resultId, []]
    } else {
      return [null, errors]
    }
  }
}