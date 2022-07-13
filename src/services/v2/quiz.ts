import Quiz, {
  QuizForm,
  QuizListing,
  QuizType,
  QuizUploadData,
  QuizWithAllowedUsernames,
} from 'models/quiz'

import QuizRepository from 'repositories/quiz'
import ResultRepository from 'repositories/result'
import UserRepository from 'repositories/user'

import { Inject, Service } from 'express-di'
import { isValidExpiration } from 'middleware/validation/quiz'
import { Question } from 'models/questiontypes'
import { ObjectId, WithId } from 'mongodb'
import { ServiceError, ValidationError } from 'services/v2/errors'

@Inject
export default class QuizServiceV2 extends Service() {
  constructor(
    private quizRepo: QuizRepository,
    private userRepo: UserRepository,
    private resultsRepo: ResultRepository
  ) {
    super()
  }

  /**
   * Gets all {@link Quiz quizzes} created by `userId` as listings format.
   *
   * @return A list of quizzes created by the user.
   */
  async getQuizzesByUserAsListing(userId: string): Promise<QuizListing[]> {
    return Promise.all(
      (await this.quizRepo.findByUserId(userId)).map(
        this.convertQuizToListing,
        this
      )
    )
  }

  /**
   * Gets all {@link Quiz quizzes} created by `userId` in full format but
   * with `allowedUser` ids converted to usernames.
   *
   * @return A list of quizzes created by the user.
   */
  async getFullQuizzesByUser(
    userId: string
  ): Promise<QuizWithAllowedUsernames[]> {
    return Promise.all(
      (await this.quizRepo.findByUserId(userId)).map(
        this.convertQuizAllowedUsers,
        this
      )
    )
  }

  /**
   * Gets a single {@link QuizListing} by its `quizId`.
   *
   * @throws ServiceError If the user does not own the quiz.
   *
   * @return The listing for the Quiz, if it exists and `ownerId` is actually the owner, or
   * `null` if the Quiz doesn't exist.
   */
  async getQuizListing(
    quizId: string,
    ownerId: string
  ): Promise<QuizType<'listing'> | null> {
    const quiz = await this.getQuizIfOwner(quizId, ownerId)

    if (quiz == null) {
      return null
    }

    return this.convertQuizToListing(quiz)
  }

  /**
   * Gets a single {@link QuizWithAllowedUsernames} by its `quizId`.
   *
   * @throws ServiceError If the user does not own the quiz.
   *
   * @return The listing for the Quiz, if it exists and `ownerId` is actually the owner, or
   * `null` if the Quiz doesn't exist.
   */
  async getFullQuiz(
    quizId: string,
    ownerId: string
  ): Promise<QuizType<'full'> | null> {
    const quiz = await this.getQuizIfOwner(quizId, ownerId)
    if (quiz == null) {
      return null
    }

    return this.convertQuizAllowedUsers(quiz)
  }

  private async convertQuizAllowedUsers(
    quiz: Quiz
  ): Promise<QuizWithAllowedUsernames> {
    const allowedUsernames = await this.userRepo.getUsernames(quiz.allowedUsers)

    return {
      ...quiz,
      allowedUsers: allowedUsernames,
      resultsCount: quiz.results.length,
      questionCount: quiz.questions?.length,
    }
  }

  private convertQuizToListing(quiz: Quiz): QuizListing {
    const { questions, results, allowedUsers, ...rest } = quiz

    return {
      ...rest,
      resultsCount: results.length,
      questionCount: questions?.length,
    }
  }

  /**
   * Gets a {@link QuizForm} by its quiz's `quizId`.
   *
   * @throws ServiceError(403) If the user does not have permission to view the quiz.
   *
   * @return The form for the Quiz, if it exists, or  `null` if the Quiz doesn't exist.
   */
  async getQuizForm(quizId: string, userId: string): Promise<QuizForm | null> {
    const quiz = await this.quizRepo.repo.findById(quizId)
    if (quiz == null) {
      return null
    }

    if (!this.canUserViewQuiz(userId, quiz)) {
      throw new ServiceError(403)
    }

    return this.convertToForm(quiz)
  }

  /**
   * Creates and saves a new Quiz.
   *
   * @throws ServiceError(400) if the user identified by `userId` does not exist.
   *
   * @param quizData The data for the new Quiz.
   * @param userId The user to identify as the Quiz owner.
   */
  async createQuiz(
    quizData: QuizUploadData,
    userId: string
  ): Promise<ObjectId> {
    const user = await this.userRepo.repo.findById(userId)
    if (user == null) {
      throw new ServiceError(400)
    }

    const { title, expiration, isPublic, questions, allowedUsers } = quizData
    const allowedUserIds = await this.userRepo.getUserIds(allowedUsers ?? [])

    const quizId = await this.quizRepo.repo.insert(
      new Quiz(user._id, title, expiration, isPublic, questions, allowedUserIds)
    )

    await this.userRepo.addQuiz(user._id, quizId)

    return quizId
  }

  /**
   * Adds a result to the list of quiz results
   * @param quizId
   * @param resultId
   */
  async addResult(
    quizId: string | ObjectId,
    resultId: string | ObjectId
  ): Promise<void> {
    await this.quizRepo.addResult(quizId, resultId)
  }

  /**
   * Removes a result from the quiz's list of results.
   * @param quizId
   * @param resultId
   */
  async removeResult(
    quizId: string | ObjectId,
    resultId: string | ObjectId
  ): Promise<void> {
    await this.quizRepo.removeResult(quizId, resultId)
  }

  /**
   * Updates an existing quiz. If there are {@link ValidationError} that would cause a conflict,
   * this returns the errors instead of updating.
   *
   *
   * @param quizId id of quiz to update
   *
   * @param edits data to update current quiz data with
   *
   * @param userId id of the user updating the quiz
   *
   * @throws ServiceError(403) if the user does not own the quiz.
   *
   * @throws ServiceError(404) if the quiz does not already exist.
   *
   * @returns List of errors when updating the quiz.
   */
  async updateQuiz(
    quizId: string,
    userId: string,
    edits: QuizUploadData
  ): Promise<ValidationError[]> {
    const original = await this.quizRepo.repo.findById(quizId)
    if (!original) {
      throw new ServiceError(404)
    }

    if (!QuizServiceV2.userOwnsQuiz(userId, original)) {
      throw new ServiceError(403)
    }

    const validationErrors = QuizServiceV2.validateQuizEdits(edits, original)
    if (validationErrors.length !== 0) {
      return validationErrors
    }

    const allowedUsers = new Set(
      await this.userRepo.getUserIds(edits.allowedUsers || [])
    )

    // Merge user IDs from existing results with the edit's IDs so
    // the edit cannot remove users that have already taken quiz.
    for (const resultId of original.results) {
      const result = await this.resultsRepo.repo.findById(resultId)
      if (result != null) {
        const user = await this.userRepo.repo.findById(result.user)
        if (user != null) {
          allowedUsers.add(user._id as ObjectId)
        }
      }
    }

    await this.quizRepo.repo.update(quizId, {
      ...edits,
      allowedUsers: [...allowedUsers],
    })

    return []
  }

  /**
   * Deletes a quiz by id
   *
   * @throws ServiceError(404) if the Quiz doesn't exist
   *
   * @throws ServiceError(403) if the request user doesn't own the quiz.
   */
  async deleteQuiz(quizId: string, userId: string): Promise<void> {
    const quiz = await this.quizRepo.repo.findById(quizId)

    if (!quiz) {
      throw new ServiceError(404)
    }

    if (!QuizServiceV2.userOwnsQuiz(userId, quiz)) {
      throw new ServiceError(403)
    }

    // Clean up references to this quiz in results
    for (const resultId of quiz.results) {
      const result = await this.resultsRepo.repo.findById(resultId)

      if (result) {
        await this.resultsRepo.repo.delete(resultId)
        await this.userRepo.removeResult(result.user, resultId)
      }
    }

    // Remove the quiz from the user's quizzes so they can't try to access it
    await this.userRepo.removeQuiz(quiz.user, quizId)

    await this.quizRepo.repo.delete(quizId)
  }

  private async getQuizIfOwner(
    quizId: string,
    userId: string
  ): Promise<Quiz | null> {
    const quiz = await this.quizRepo.repo.findById(quizId)
    if (quiz == null) {
      return null
    }
    const isQuizOwner = userId === quiz.user.toString()
    if (!isQuizOwner) {
      throw new ServiceError(403)
    }

    return quiz
  }

  private canUserViewQuiz(userId: string, quiz: Quiz) {
    return (
      quiz.isPublic ||
      quiz.user.toString() === userId ||
      quiz.allowedUsers.some((id: ObjectId) => id.equals(userId))
    )
  }

  private static userOwnsQuiz(userId: string, quiz: WithId<Quiz>) {
    return quiz.user.equals(userId)
  }

  /**
   * Converts a Quiz to a QuizForm by removing extra data that users shouldn't see,
   * such as the "correctAnswer" value so that users can't cheat by inspecting the object
   * or obtain sensitive data.
   *
   * @throws ServiceError with code 500 if the Quiz is malformed (has zero questions).
   */
  private async convertToForm(quiz: WithId<Quiz>): Promise<QuizForm> {
    const {
      user,
      allowedUsers,
      showCorrectAnswers,
      allowMultipleResponses,
      isPublic,
      results,
      questions,
      ...form
    } = quiz

    const quizForm: QuizForm = { ...form }

    if (questions.length === 0) {
      throw new ServiceError(500, `quiz ${quiz._id} has no questions`)
    }

    quizForm.questions = new Array(questions.length)

    for (let i = 0; i < quizForm.questions.length; ++i) {
      const { correctAnswer, ...question } = questions[i]
      quizForm.questions[i] = question
    }

    // Return the quiz creator's username as part of the form because this
    // data is intended for users rather than the server
    const [username] = await this.userRepo.getUsernames([quiz.user])

    quizForm.user = username

    return quizForm
  }

  /**
   * Determines if two questions are compatible with each other.
   * Questions are compatible when they have the same type and any immutable
   * data (such as number of answers) have not been changed.
   */
  private static questionsCompatible(q1: Question, q2: Question): Boolean {
    q1.type ??= 'MultipleChoice'
    q2.type ??= 'MultipleChoice'

    return (
      (q1.type === 'MultipleChoice' &&
        q2.type === 'MultipleChoice' &&
        q1.correctAnswer === q2.correctAnswer &&
        q1.answers.length === q2.answers.length) ||
      (q1.type === 'FillIn' &&
        q2.type === 'FillIn' &&
        q1.correctAnswer === q2.correctAnswer)
    )
  }

  /**
   * Validates edits to a Quiz, returning any errors in the process.
   */
  private static validateQuizEdits(
    edits: QuizUploadData,
    original: Quiz
  ): ValidationError[] {
    const errors = []

    if (
      !isValidExpiration(edits.expiration) &&
      edits.expiration !== original.expiration
    ) {
      errors.push({
        field: 'expiration',
        message: 'Expiration must be a date and time in the future',
        value: edits.expiration,
      })
    }

    if (
      original.questions.length !== edits.questions.length ||
      !original.questions.every((question, ind) =>
        QuizServiceV2.questionsCompatible(question, edits.questions[ind])
      )
    ) {
      errors.push({
        field: 'questions',
        message:
          'Cannot change correctAnswers or number of questions for existing quiz',
      })
    }

    return errors
  }
}
