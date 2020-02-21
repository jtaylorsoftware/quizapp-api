import { UserRepository } from '../repositories/user'
import { User } from '../models/user'

const bcrypt = require('bcryptjs')

export class UserService {
  constructor(private userRepository: UserRepository) {
    this.userRepository = userRepository
  }

  /**
   * Gets a user's data from their id
   * @param userId
   * @returns user data
   */
  async getUserById(userId) {
    const user = await this.userRepository.findById(userId)
    if (user) {
      const { password, ...userData } = user
      return userData
    }
    return null
  }

  /**
   * Gets a user's data from their username
   * @param username
   * @returns user data
   */
  async getUserByUsername(username) {
    const user = await this.userRepository.findByUsername(username)
    if (user) {
      const { password, ...userData } = user
      return userData
    }
    return null
  }

  /**
   * Returns a list of usernames with matching user ids
   * @param userIds
   */
  async getUsernamesFromIds(userIds) {
    const usernames = await this.userRepository.getUsernames(userIds)
    return usernames
  }

  /**
   * Returns a list of user ids with matching usernames
   * @param usernames
   */
  async getIdsFromUsernames(usernames) {
    const ids = await this.userRepository.getUserIds(usernames)
    return ids
  }

  /**
   * Gets user's quizzes
   * @param userId
   */
  async getUserQuizzes(userId) {
    const user = await this.userRepository.findById(userId)
    return user.quizzes
  }

  /**
   * Gets user's results
   * @param userId
   */
  async getUserResults(userId) {
    const user = await this.userRepository.findById(userId)
    return user.results
  }

  /**
   * Add a quiz to user's list of created quizzes
   * @param userId
   * @param quizId
   */
  async addQuiz(userId, quizId) {
    await this.userRepository.addQuiz(userId, quizId)
  }

  /**
   * Removes a user's quiz
   * @param userId
   * @param quizId
   */
  async removeQuiz(userId, quizId) {
    await this.userRepository.removeQuiz(userId, quizId)
  }

  /**
   * Add a a quiz result to user's results
   * @param userId
   * @param resultId
   */
  async addResult(userId, resultId) {
    await this.userRepository.addResult(userId, resultId)
  }

  /**
   * Remove a user's quiz result
   * @param userId
   * @param resultId
   */
  async removeResult(userId, resultId) {
    await this.userRepository.removeResult(userId, resultId)
  }

  /**
   * Authorizes a user, ensuring they exist and present valid credentials.
   * @param username
   * @param password
   * @returns string with user id if authorized, empty if not authorized
   */
  async authorizeUser(username, password) {
    let userId = null
    const errors = []
    // try to find a user with a matching username
    const user = await this.userRepository.findByUsername(username)
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
   * @param userId
   * @param email
   * @returns true if email was set and not previously in use
   */
  async changeUserEmail(userId, email) {
    const existingUser = await this.userRepository.findByEmail(email)
    if (!existingUser) {
      await this.userRepository.updateEmail(userId, email)
      return true
    }
    return false
  }

  /**
   * Updates the user's password
   * @param userId
   * @param password
   */
  async changeUserPassword(userId, password) {
    const salt = await bcrypt.genSalt(10)
    const encryptedPass = await bcrypt.hash(password, salt)
    await this.userRepository.updatePassword(userId, encryptedPass)
  }

  /**
   * Registers a new user
   * @param user user data to register
   * @param user.email
   * @param user.password
   * @param user.username
   * @returns user id and array of fields that had errors
   */
  async registerUser({ email, username, password }) {
    const errors = []

    let existingUser = await this.userRepository.findByEmail(email)

    if (existingUser) {
      errors.push({ email: 'Email is already in use.', value: email })
    }
    existingUser = await this.userRepository.findByUsername(username)
    if (existingUser) {
      errors.push({ username: 'Username is already in use.', value: username })
    }

    let user: User
    if (errors.length === 0) {
      user = new User(username, email, password)

      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(password, salt)

      user = await this.userRepository.insert(user)
    }

    return [user._id, errors]
  }

  /**
   * Deletes the user
   * @param userId
   */
  async deleteUser(userId) {
    await this.userRepository.delete(userId)
  }
}
