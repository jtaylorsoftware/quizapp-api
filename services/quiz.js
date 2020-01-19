const { Quiz } = require('../models/quiz')

class QuizService {
  constructor(quizRepository) {
    this.quizRepository = quizRepository
  }

  /**
   * Gets a quiz by id
   * @param {string} quizId
   * @returns {Quiz}
   */
  async getQuizById(quizId) {
    const quiz = await this.quizRepository.findById(quizId)
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
    const quiz = await this.quizRepository.insert(
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
    await this.quizRepository.update(quizId, {
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
    await this.quizRepository.delete(quizId)
    // await this.userRepository.removeQuiz(user, quizId)
  }

  // /**
  //  * Transforms a list of user Ids into a list of usernames
  //  * @param {[string]} userids
  //  * @returns {[string]} array of usernames
  //  */
  // async _getUsernames(userids) {
  //   const usernames = []
  //   for (const id of userids) {
  //     const user = await this.userRepository.findById(id)
  //     if (user) {
  //       usernames.push(user.username)
  //     }
  //   }
  //   return usernames
  // }

  // /**
  //  * Transforms a list of usernames into a list of user ids
  //  * @param {[string]} usernames
  //  * @returns {[string]} array of user ids
  //  */
  // async _getUserIds(usernames) {
  //   const userIds = []
  //   for (const username of usernames) {
  //     const user = await this.userRepository.findByUsername(username)
  //     if (user) {
  //       userIds.push(user._id)
  //     }
  //   }
  //   return userIds
  // }
}

exports.QuizService = QuizService
