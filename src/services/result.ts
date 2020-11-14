import async from 'async'

import ResultRepository from 'repositories/result'
import Result, { Answer } from 'models/result'
import { Inject, Service } from 'express-di'
import { ObjectId } from 'mongodb'
import Quiz from 'models/quiz'

@Inject
export default class ResultService extends Service() {
  constructor(private resultRepository: ResultRepository) {
    super()
  }

  async getResult(resultId): Promise<Result | null> {
    const result: Result | null = await this.resultRepository.repo.findById(
      resultId
    )
    return result
  }

  async deleteResult(resultId: string | ObjectId) {
    await this.resultRepository.repo.delete(resultId)
  }

  async getUserResultForQuiz(
    userId: string | ObjectId,
    quizId: string | ObjectId
  ) {
    const result = await this.resultRepository.findByUserAndQuizId(
      userId,
      quizId
    )
    return result
  }

  async createResult(
    answers: Answer[],
    userId: string | ObjectId,
    quiz: Quiz
  ): Promise<[ObjectId, any[]]> {
    const errors = []

    if (!ObjectId.isValid(userId)) {
      errors.push('userId')
      return [null, errors]
    }

    if (!quiz.allowMultipleResponses) {
      const duplicateResult: any = await async.some(
        quiz.results,
        async (resultId: ObjectId) => {
          const result = <Result>(
            await this.resultRepository.repo.findById(resultId)
          )
          return result && result.user.toString() === userId
        }
      )

      if (duplicateResult) {
        errors.push('duplicate')
        return [null, errors]
      }
    }

    const questions = quiz.questions
    if (answers.length !== questions.length) {
      errors.push('answers')
      return [null, errors]
    }

    let score = 0
    for (let i = 0; i < questions.length; ++i) {
      const question = questions[i]
      const answer = answers[i]

      if (answer.choice >= question.answers.length) {
        errors.push(`answer ${i + 1}`)
      } else {
        const correctAnswer = question.correctAnswer
        answer.isCorrect = correctAnswer === answer.choice
        if (answer.isCorrect) {
          score += 1 / answers.length
        }
        if (quiz.showCorrectAnswers) {
          answer.correctAnswer = correctAnswer
        }
      }
    }
    if (errors.length === 0) {
      const result = await this.resultRepository.repo.insert(
        new Result(new ObjectId(userId), quiz._id, quiz.user, answers, score)
      )
      return [result._id, undefined]
    } else {
      return [undefined, errors]
    }
  }
}
