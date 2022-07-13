import async from 'async'

import { Inject, Service } from 'express-di'
import {
  Answer,
  FillInGradedAnswer,
  GradedAnswer,
  MultipleChoiceGradedAnswer,
} from 'models/answertypes'
import { FillInQuestion, MultipleChoiceQuestion } from 'models/questiontypes'
import Quiz from 'models/quiz'
import Result, {
  ResultExtras,
  ResultListing,
  ResultType,
  ResultWithExtras,
} from 'models/result'
import moment from 'moment'
import { ObjectId, WithId } from 'mongodb'
import QuizRepository from 'repositories/quiz'
import ResultRepository from 'repositories/result'
import UserRepository from 'repositories/user'
import { ServiceError, ValidationError } from 'services/v2/errors'

@Inject
export default class ResultServiceV2 extends Service() {
  constructor(
    private quizRepo: QuizRepository,
    private resultRepo: ResultRepository,
    private userRepo: UserRepository
  ) {
    super()
  }

  /**
   * Gets all {@link Result quiz results} for the user with id `userId`.
   *
   * @throws ServiceError(403) If `requestUserId` has insufficient permission to view the results.
   *
   * @return A list of quiz results for the user.
   */
  async getAllResultsByUserAsListing(
    userId: string,
    requestUserId: string
  ): Promise<ResultType<'listing'>[]> {
    return Promise.all(
      (await this.resultRepo.findByUserId(userId)).map(async (result) => {
        if (!this.canUserViewResult(requestUserId, result)) {
          throw new ServiceError(403)
        }

        const extras = await this.getExtrasForResult(result)
        const { answers, ...listing } = result

        return {
          ...listing,
          ...extras,
        }
      })
    )
  }

  /**
   * Gets all {@link Result quiz results} for the user with id `userId`.
   *
   * @throws ServiceError(403) If `requestUserId` has insufficient permission to view the results.
   *
   * @return A list of quiz results for the user.
   */
  async getFullResultsByUser(
    userId: string,
    requestUserId: string
  ): Promise<ResultType<'full'>[]> {
    return Promise.all(
      (await this.resultRepo.findByUserId(userId)).map(async (result) => {
        if (!this.canUserViewResult(requestUserId, result)) {
          throw new ServiceError(403)
        }

        const extras = await this.getExtrasForResult(result)

        return {
          ...result,
          ...extras,
        }
      })
    )
  }

  private async getExtrasForResult(result: Result): Promise<ResultExtras> {
    const [ownerUsername] = await this.userRepo.getUsernames([result.quizOwner])
    if (ownerUsername == null) {
      throw new Error(`Unable to find user with id ${result.quizOwner}`)
    }
    const [username] = await this.userRepo.getUsernames([result.user])
    if (username == null) {
      throw new Error(`Unable to find user with id ${result.user}`)
    }
    const quiz = await this.quizRepo.repo.findById(result.quiz)
    if (quiz == null) {
      throw new Error(`Unable to find quiz with id ${result.quiz}`)
    }

    return {
      username,
      quizTitle: quiz.title,
      ownerUsername,
    }
  }

  /**
   * Gets a single user's full quiz result for a quiz with the given id.
   *
   * @throws ServiceError(403) If `requestUserId` has insufficient permission to view the results.
   */
  async getFullUserResultForQuiz(
    userId: string,
    quizId: string,
    requestUserId: string
  ): Promise<ResultWithExtras | null> {
    const result = await this.resultRepo.findByUserAndQuizId(userId, quizId)
    if (result == null) {
      return null
    }
    if (!this.canUserViewResult(requestUserId, result)) {
      throw new ServiceError(403)
    }
    const extras = await this.getExtrasForResult(result)

    return {
      ...result,
      ...extras,
    }
  }

  /**
   * Gets a single user's full quiz result for a quiz with the given id.
   *
   * @throws ServiceError(403) If `requestUserId` has insufficient permission to view the results.
   */
  async getUserResultListingForQuiz(
    userId: string,
    quizId: string,
    requestUserId: string
  ): Promise<ResultListing | null> {
    const result = await this.resultRepo.findByUserAndQuizId(userId, quizId)
    if (result == null) {
      return null
    }
    if (!this.canUserViewResult(requestUserId, result)) {
      throw new ServiceError(403)
    }
    const extras = await this.getExtrasForResult(result)
    const { answers, ...listing } = result
    return {
      ...listing,
      ...extras,
    }
  }

  /**
   * Gets all full quiz results for a quiz with the given id.
   *
   * @throws ServiceError(403) If `requestUserId` has insufficient permission to view the results.
   */
  async getAllFullResultsForQuiz(
    quizId: string,
    requestUserId: string
  ): Promise<ResultWithExtras[]> {
    const results = await this.resultRepo.findAllByQuizId(quizId)
    return Promise.all(
      results.map(async (result) => {
        if (!this.canUserViewResult(requestUserId, result)) {
          throw new ServiceError(403)
        }
        const extras = await this.getExtrasForResult(result)
        return {
          ...result,
          ...extras,
        }
      })
    )
  }

  /**
   * Gets all quiz result listings for a quiz with the given id.
   * @throws ServiceError(403) If `requestUser` has insufficient permission to view the results.
   */
  async getAllResultListingForQuiz(
    quizId: string,
    requestUser: string
  ): Promise<ResultListing[]> {
    const results = await this.resultRepo.findAllByQuizId(quizId)
    return Promise.all(
      results.map(async (result) => {
        if (!this.canUserViewResult(requestUser, result)) {
          throw new ServiceError(403)
        }
        const extras = await this.getExtrasForResult(result)
        const { answers, ...listing } = result
        return {
          ...listing,
          ...extras,
        }
      })
    )
  }

  private canUserViewResult(
    userId: string,
    result: ResultType<'full' | 'listing'>
  ): Boolean {
    // Ensure that the request user owns some part of the data they're requesting,
    // either the result itself or the related quiz
    const isResultOwner = result.user.toString() === userId
    const isQuizOwner = result.quizOwner.toString() === userId
    return isResultOwner || isQuizOwner
  }

  /**
   * Attempt to grade a Quiz and persist it as a Result.
   *
   * @throws ServiceError(404) if the Quiz does not exist.
   * @throws ServiceError(403) if the user represented by `userId` cannot
   * view this Quiz (not public and not in allowedUsers).
   *
   * @param answers Ungraded answers to a Quiz.
   * @param userId id of the user submitting answers.
   * @param quizId id of the Quiz being answered.
   */
  async createResult(
    answers: Answer[],
    userId: string,
    quizId: string
  ): Promise<[ObjectId | null, ValidationError[]]> {
    const errors: ValidationError[] = []

    if (!ObjectId.isValid(userId)) {
      errors.push({
        field: 'userId',
        message: 'userId does not represent a valid id',
        value: userId,
      })
      return [null, errors]
    }

    // Check if quiz exists
    const quiz = await this.quizRepo.repo.findById(quizId)
    if (quiz == null) {
      throw new ServiceError(404)
    }

    // Check if user has permission to view and answer quiz
    if (!this.canUserViewQuiz(userId, quiz)) {
      throw new ServiceError(403)
    }

    // Check if the quiz has already expired
    if (moment(quiz.expiration).diff(moment()) < 0) {
      // quiz expired
      const errors: ValidationError[] = [
        {
          field: 'expiration',
          message: 'Quiz has expired',
        },
      ]
      return [null, errors]
    }

    // Check to see if this would be the user's second time responding
    // TODO: also do this check when requesting a Form
    if (!quiz.allowMultipleResponses) {
      // This is a valid use of async.some - with no callback supplied it returns Promise
      // noinspection JSVoidFunctionReturnValueUsed
      const duplicateResult: any /* boolean */ = await async.some(
        quiz.results,
        async (resultId: ObjectId) => {
          const result = <Result>await this.resultRepo.repo.findById(resultId)
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

    // Check if there were errors encountered during grading
    // and return them instead of saving the result if so
    if (errors.length === 0) {
      const resultId = await this.resultRepo.repo.insert(
        new Result(
          new ObjectId(userId),
          quiz._id as ObjectId,
          quiz.user,
          gradedAnswers,
          score
        )
      )

      // Also save to the user's and quiz's list of results
      await this.userRepo.addResult(userId, resultId)
      await this.quizRepo.addResult(quiz._id, resultId)

      return [resultId, []]
    } else {
      return [null, errors]
    }
  }

  // TODO - repeated code (also in services/v2/quiz), extract somewhere sensible
  private canUserViewQuiz(userId: string, quiz: WithId<Quiz>) {
    return (
      quiz.isPublic ||
      quiz.user.toString() === userId ||
      quiz.allowedUsers.some((id: ObjectId) => id.equals(userId))
    )
  }
}
