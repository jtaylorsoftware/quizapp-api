import bcrypt from 'bcryptjs'

import UserRepository from 'repositories/user'
import User from 'models/user'
import { Inject, Service } from 'express-di'
import { ObjectId } from 'mongodb'

@Inject
export default class UserService extends Service() {
  constructor(private userRepository: UserRepository) {
    super()
  }

  /**
   * Gets a user's data from their id
   * @param userId
   * @returns user data
   */
  async getUserById(userId: string | ObjectId) {
    const user = <User>await this.userRepository.repo.findById(userId)
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
  async getUserByUsername(username: string) {
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
  async getUsernamesFromIds(userIds: Array<string | ObjectId>) {
    const usernames = await this.userRepository.getUsernames(userIds)
    return usernames
  }

  /**
   * Returns a list of user ids with matching usernames
   * @param usernames
   */
  async getIdsFromUsernames(usernames: string[]) {
    const ids = await this.userRepository.getUserIds(usernames)
    return ids
  }

  /**
   * Gets user's quizzes
   * @param userId
   */
  async getUserQuizzes(userId: string | ObjectId) {
    const user = <User>await this.userRepository.repo.findById(userId)
    return user.quizzes
  }

  /**
   * Gets user's results
   * @param userId
   */
  async getUserResults(userId: string | ObjectId) {
    const user = <User>await this.userRepository.repo.findById(userId)
    return user.results
  }

  /**
   * Add a quiz to user's list of created quizzes
   * @param userId
   * @param quizId
   */
  async addQuiz(userId: string | ObjectId, quizId: string | ObjectId) {
    await this.userRepository.addQuiz(userId, quizId)
  }

  /**
   * Removes a user's quiz
   * @param userId
   * @param quizId
   */
  async removeQuiz(userId: string | ObjectId, quizId: string | ObjectId) {
    await this.userRepository.removeQuiz(userId, quizId)
  }

  /**
   * Add a a quiz result to user's results
   * @param userId
   * @param resultId
   */
  async addResult(userId: string | ObjectId, resultId: string | ObjectId) {
    await this.userRepository.addResult(userId, resultId)
  }

  /**
   * Remove a user's quiz result
   * @param userId
   * @param resultId
   */
  async removeResult(userId: string | ObjectId, resultId: string | ObjectId) {
    await this.userRepository.removeResult(userId, resultId)
  }

  /**
   * Authorizes a user, ensuring they exist and present valid credentials.
   * @param username
   * @param password
   * @returns string with user id if authorized, empty if not authorized
   */
  async authorizeUser(username: string, password: string) {
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
  async changeUserEmail(userId: string | ObjectId, email: string) {
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
  async changeUserPassword(userId: string | ObjectId, password: string) {
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
  async registerUser({
    email,
    username,
    password
  }: Partial<User>): Promise<[ObjectId, any[]]> {
    const errors = []

    let existingUser = await this.userRepository.findByEmail(email)

    if (existingUser) {
      errors.push({ email: 'Email is already in use.', value: email })
    }
    existingUser = await this.userRepository.findByUsername(username)
    if (existingUser) {
      errors.push({ username: 'Username is already in use.', value: username })
    }

    if (errors.length === 0) {
      let user = new User(username, email, password)

      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(password, salt)

      user = await this.userRepository.repo.insert(user)
      return [user._id, undefined]
    } else {
      return [undefined, errors]
    }
  }

  /**
   * Deletes the user
   * @param userId
   */
  async deleteUser(userId: string | ObjectId) {
    await this.userRepository.repo.delete(userId)
  }
}
