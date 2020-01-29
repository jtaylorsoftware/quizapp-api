const { Quiz } = require('../models/quiz')

class QuizService {
  constructor(quizRepository) {
    this._quizRepository = quizRepository
  }

  /**
   * Gets a quiz by id
   * @param {string} quizId
   * @returns {Quiz}
   */
  async getQuizById(quizId) {
    const quiz = await this._quizRepository.findById(quizId)
    return quiz
  }

  // /**
  //  * Gets a user's responses to a quiz
  //  * @param {string} quizId
  //  * @param {string} userId
  //  */
  // async getUserResponsesToQuiz(quizId, userId) {
  //   // TODO
  // }

  /**
   * Adds a result to the list of quiz results
   * @param {string|ObjectId} quizId
   * @param {string|ObjectId} resultId
   */
  async addResult(quizId, resultId) {
    await this._quizRepository.addResult(quizId, resultId)
  }

  /**
   * Removes a result from the quiz's list of results.
   * @param {string|ObjectId} quizId
   * @param {string|ObjectId} resultId
   */
  async removeResult(quizId, resultId) {
    await this._quizRepository.removeResult(quizId, resultId)
  }

  /**
   * Creates a new quiz
   * @param {Quiz} quiz quiz data
   * @returns {string} created quiz's id
   */
  async createQuiz({
    user,
    title,
    expiresIn,
    isPublic,
    questions,
    allowedUsers
  }) {
    // const allowedUserIds = await this._getUserIds(allowedUsers)
    const quiz = await this._quizRepository.insert(
      new Quiz(user, title, expiresIn, isPublic, questions, allowedUsers)
    )

    // await this.userRepository.addQuiz(user, quiz)
    return quiz._id
  }

  /**
   * Updates an existing quiz
   * @param {string} quizId id of quiz to update
   * @param {Quiz} quiz data to replace current data with
   */
  async updateQuiz(
    quizId,
    { title, expiresIn, isPublic, questions, allowedUsers }
  ) {
    // const allowedUserIds = await this._getUserIds(allowedUsers)
    await this._quizRepository.update(quizId, {
      title,
      isPublic,
      questions,
      expiresIn,
      allowedUsers
    })
  }

  /**
   * Deletes a quiz by id
   * @param {string} quizId
   */
  async deleteQuiz(quizId) {
    await this._quizRepository.delete(quizId)
  }
}

exports.QuizService = QuizService
