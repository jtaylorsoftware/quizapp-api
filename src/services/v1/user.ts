import bcrypt from 'bcryptjs'

import UserRepository from 'repositories/user'
import User, { UserWithoutPassword } from 'models/user'
import { Inject, Service } from 'express-di'
import { ObjectId } from 'mongodb'
import { ServiceError } from './errors'

export type UserDto = Omit<User, '_id' | 'date' | 'quizzes' | 'results'>

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
  async getUserById(userId: string | ObjectId): Promise<UserWithoutPassword | null> {
    const user = await this.userRepository.repo.findById(userId)
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
  async getUserByUsername(username: string): Promise<UserWithoutPassword | null> {
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
  async getUsernamesFromIds(userIds: Array<string | ObjectId>): Promise<string[]> {
    return await this.userRepository.getUsernames(userIds)
  }

  /**
   * Returns a list of user ids with matching usernames
   * @param usernames
   */
  async getIdsFromUsernames(usernames: string[]): Promise<ObjectId[]> {
    return await this.userRepository.getUserIds(usernames)
  }

  /**
   * Gets user's quizzes
   * @param userId
   */
  async getUserQuizzes(userId: string | ObjectId): Promise<ObjectId[]> {
    const user = <User>await this.userRepository.repo.findById(userId)
    return user.quizzes
  }

  /**
   * Gets user's results
   * @param userId
   */
  async getUserResults(userId: string | ObjectId): Promise<ObjectId[]> {
    const user = <User>await this.userRepository.repo.findById(userId)
    return user.results
  }

  /**
   * Add a quiz to user's list of created quizzes
   * @param userId
   * @param quizId
   */
  async addQuiz(userId: string | ObjectId, quizId: string | ObjectId): Promise<void> {
    await this.userRepository.addQuiz(userId, quizId)
  }

  /**
   * Removes a user's quiz
   * @param userId
   * @param quizId
   */
  async removeQuiz(userId: string | ObjectId, quizId: string | ObjectId): Promise<void> {
    await this.userRepository.removeQuiz(userId, quizId)
  }

  /**
   * Add a a quiz result to user's results
   * @param userId
   * @param resultId
   */
  async addResult(userId: string | ObjectId, resultId: string | ObjectId): Promise<void> {
    await this.userRepository.addResult(userId, resultId)
  }

  /**
   * Remove a user's quiz result
   * @param userId
   * @param resultId
   */
  async removeResult(userId: string | ObjectId, resultId: string | ObjectId): Promise<void> {
    await this.userRepository.removeResult(userId, resultId)
  }

  /**
   * Authorizes a user, ensuring they exist and present valid credentials.
   * @param username
   * @param password
   * @returns string with user id if authorized, empty if not authorized
   */
  async authorizeUser(username: string, password: string): Promise<[ObjectId | undefined, ServiceError[]]> {
    let userId: ObjectId | undefined
    const errors: ServiceError[] = []
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
  async changeUserEmail(userId: string | ObjectId, email: string): Promise<boolean> {
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
  async changeUserPassword(userId: string | ObjectId, password: string): Promise<void> {
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
  async registerUser(
    {
      email,
      username,
      password,
    }: UserDto): Promise<[ObjectId | undefined, ServiceError[]]> {
    const errors: ServiceError[] = []

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

      const userId = await this.userRepository.repo.insert(user)
      return [userId, errors]
    } else {
      return [undefined, errors]
    }
  }

  /**
   * Deletes the user
   * @param userId
   */
  async deleteUser(userId: string | ObjectId): Promise<void> {
    await this.userRepository.repo.delete(userId)
  }
}
