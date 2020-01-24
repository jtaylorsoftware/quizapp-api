const { User } = require('../models/user')
const bcrypt = require('bcryptjs')

class UserService {
  constructor(userRepository) {
    this._userRepository = userRepository
  }

  /**
   * Gets a user's data from their id
   * @param {string} userId
   * @returns {object} user data
   */
  async getUserById(userId) {
    const user = await this._userRepository.findById(userId)
    if (user) {
      const { password, ...userData } = user
      return userData
    }
    return null
  }

  /**
   * Gets a user's data from their username
   * @param {string} username
   * @returns {object} user data
   */
  async getUserByUsername(username) {
    const user = await this._userRepository.findByUsername(username)
    if (user) {
      const { password, ...userData } = user
      return userData
    }
    return null
  }

  /**
   * Returns a list of usernames with matching user ids
   * @param {[string|ObjectId]} userIds
   */
  async getUsernamesFromIds(userIds) {
    const usernames = await this._userRepository.getUsernames(userIds)
    return usernames
  }

  /**
   * Returns a list of user ids with matching usernames
   * @param {[string|ObjectId]} usernames
   */
  async getIdsFromUsernames(usernames) {
    const ids = await this._userRepository.getUserIds(usernames)
    return ids
  }

  /**
   * Gets user's quizzes
   * @param {string} userId
   */
  async getUserQuizzes(userId) {
    const user = await this._userRepository.findById(userId)
    return user.quizzes
  }

  /**
   * Gets user's results
   * @param {string} userId
   */
  async getUserResults(userId) {
    const user = await this._userRepository.findById(userId)
    return user.results
  }

  /**
   * Add a quiz to user's list of created quizzes
   * @param {string} userId
   * @param {string} quizId
   */
  async addQuiz(userId, quizId) {
    await this._userRepository.addQuiz(userId, quizId)
  }

  /**
   * Removes a user's quiz
   * @param {string} userId
   * @param {string} quizId
   */
  async removeQuiz(userId, quizId) {
    await this._userRepository.removeQuiz(userId, quizId)
  }

  /**
   * Add a a quiz result to user's results
   * @param {string} userId
   * @param {string} resultId
   */
  async addResult(userId, resultId) {
    await this._userRepository.addResult(userId, resultId)
  }

  /**
   * Remove a user's quiz result
   * @param {string} userId
   * @param {string} resultId
   */
  async removeResult(userId, resultId) {
    await this._userRepository.removeResult(userId, resultId)
  }

  /**
   * Authorizes a user, ensuring they exist and present valid credentials.
   * @param {string} username
   * @param {password} password
   * @returns {[string, [any]]} string with user id if authorized, empty if not authorized
   */
  async authorizeUser(username, password) {
    let userId = null
    const errors = []
    // try to find a user with a matching username
    const user = await this._userRepository.findByUsername(username)
    if (!user) {
      errors.push({ username: 'No matching username found.' })
    } else {
      // check if the password matches the user's password
      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch) {
        errors.push({ password: 'Invalid credentials.' })
      } else {
        userId = user._id
      }
    }

    return [userId, errors]
  }

  /**
   * Updates the user's email
   * @param {string} userId
   * @param {string} email
   * @returns {boolean} true if email was set and not previously in use
   */
  async changeUserEmail(userId, email) {
    const existingUser = await this._userRepository.findByEmail(email)
    if (!existingUser) {
      await this._userRepository.updateEmail(userId, email)
      return true
    }
    return false
  }

  /**
   * Updates the user's password
   * @param {string} userId
   * @param {string} password
   */
  async changeUserPassword(userId, password) {
    const salt = await bcrypt.genSalt(10)
    const encryptedPass = await bcrypt.hash(password, salt)
    await this._userRepository.updatePassword(userId, encryptedPass)
  }

  /**
   * Registers a new user
   * @param {object} user user data to register
   * @param {string} user.email
   * @param {string} user.password
   * @param {string} user.username
   * @returns {[string, [string]} user id and
   * array of fields that had errors
   */
  async registerUser({ email, username, password }) {
    const errors = []

    let existingUser = await this._userRepository.findByEmail(email)

    if (existingUser) {
      errors.push({ email: 'Email is already in use.', value: email })
    }
    existingUser = await this._userRepository.findByUsername(username)
    if (existingUser) {
      errors.push({ username: 'Username is already in use.', value: username })
    }

    let user = {}
    if (errors.length === 0) {
      user = new User(username, email, password)

      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(password, salt)

      user = await this._userRepository.insert(user)
    }

    return [user._id, errors]
  }

  /**
   * Deletes the user
   * @param {string} userId
   */
  async deleteUser(userId) {
    await this._userRepository.delete(userId)
  }
}

exports.UserService = UserService
