import Quiz from 'models/quiz'
import QuizRepository from 'repositories/quiz'
import { Inject, Service } from 'express-di'

@Inject
export default class QuizService extends Service() {
  constructor(private quizRepository: QuizRepository) {
    super()
  }

  /**
   * Gets a quiz by id
   * @param quizId
   * @returns
   */
  async getQuizById(quizId) {
    const quiz = await this.quizRepository.repo.findById(quizId)
    return quiz
  }

  /**
   * Adds a result to the list of quiz results
   * @param quizId
   * @param resultId
   */
  async addResult(quizId, resultId) {
    await this.quizRepository.addResult(quizId, resultId)
  }

  /**
   * Removes a result from the quiz's list of results.
   * @param quizId
   * @param resultId
   */
  async removeResult(quizId, resultId) {
    await this.quizRepository.removeResult(quizId, resultId)
  }

  /**
   * Creates a new quiz
   * @param quiz quiz data
   * @returns {string} created quiz's id
   */
  async createQuiz({
    user,
    title,
    expiration,
    isPublic,
    questions,
    allowedUsers
  }) {
    // const allowedUserIds = await this._getUserIds(allowedUsers)
    const quiz = await this.quizRepository.repo.insert(
      new Quiz(user, title, expiration, isPublic, questions, allowedUsers)
    )

    // await this.userRepository.addQuiz(user, quiz)
    return quiz._id
  }

  /**
   * Updates an existing quiz
   * @param quizId id of quiz to update
   * @param quiz data to replace current data with
   */
  async updateQuiz(
    quizId,
    { title, expiration, isPublic, questions, allowedUsers }
  ) {
    // const allowedUserIds = await this._getUserIds(allowedUsers)
    await this.quizRepository.repo.update(quizId, {
      title,
      isPublic,
      questions,
      expiration,
      allowedUsers
    })
  }

  /**
   * Deletes a quiz by id
   * @param quizId
   */
  async deleteQuiz(quizId) {
    await this.quizRepository.repo.delete(quizId)
  }
}
