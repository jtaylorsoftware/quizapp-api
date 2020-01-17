const quizValidators = require('../../middleware/validation/quiz')
const { checkErrors } = require('../../middleware/validation/checkerrors')
const { Quiz } = require('../../models/quiz')
const { authenticate } = require('../../middleware/auth')
const {
  getRequestedQuiz,
  authorizeQuizAccess,
  requireQuizOwner
} = require('../../middleware/quiz')

/**
 * @typedef {Object} Quiz
 * @property {string} user user submitting quiz
 * @property {string} title title of quiz
 * @property {Date} expiresIn expiration date
 * @property {boolean} isPublic flag indicating if quiz isn't restricted to allowed users
 * @property {[object]} questions array of question objects
 * @property {[string]} allowedUsers array of username strings
 */

class QuizController {
  constructor(userRepository, quizRepository) {
    this.userRepository = userRepository
    this.quizRepository = quizRepository
  }

  /**
   * Gets a quiz by id
   * @param {string} quizId
   * @returns {Quiz}
   */
  async getQuizFromId(quizId) {
    const quiz = await this.quizRepository.findById(quizId)
    return quiz
  }

  /**
   * Gets a quiz as a listing (excludes questions list)
   * @param {string} quizId
   * @returns {{_id, user, title, isPublic, expiresIn, date}}
   */
  async getQuizListing(quizId) {
    const quiz = await this.quizRepository.findById(quizId)
    const { questions, ...listing } = quiz
    return listing
  }

  /**
   * Gets a user's responses to a quiz
   * @param {string} quizId
   * @param {string} userId
   */
  async getUserResponsesToQuiz(quizId, userId) {
    // TODO
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
    const allowedUserIds = await this._getUserIds(allowedUsers)
    const quiz = await this.quizRepository.insert(
      new Quiz(user, title, expiresIn, isPublic, questions, allowedUserIds)
    )

    await this.userRepository.addQuiz(user, quiz)
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
    const allowedUserIds = await this._getUserIds(allowedUsers)

    await this.quizRepository.update(quizId, {
      title,
      isPublic,
      questions,
      expiresIn,
      allowedUserIds
    })
  }

  /**
   * Deletes a quiz by id and removes it from the creator's list of quizzes
   * @param {string} quizId
   * @param {string} userId id of owner (no checking is done) - if not present,
   * it will find the quiz first to get the owner id
   */
  async deleteQuiz(quizId, userId = null) {
    const user = userId || (await this.quizRepository.findById(quizId))._id
    await this.quizRepository.delete(quizId)
    await this.userRepository.removeQuiz(user, quizId)
  }

  /**
   * Transforms a list of user Ids into a list of usernames
   * @param {[string]} userids
   * @returns {[string]} array of usernames
   */
  async _getUsernames(userids) {
    const usernames = []
    for (const id of userids) {
      const user = await this.userRepository.findById(id)
      if (user) {
        usernames.push(user.username)
      }
    }
    return usernames
  }

  /**
   * Transforms a list of usernames into a list of user ids
   * @param {[string]} usernames
   * @returns {[string]} array of user ids
   */
  async _getUserIds(usernames) {
    const userIds = []
    for (const username of usernames) {
      const user = await this.userRepository.findByUsername(username)
      if (user) {
        userIds.push(user._id)
      }
    }
    return userIds
  }
}

exports.QuizController = QuizController
