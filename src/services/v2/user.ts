import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import UserRepository from 'repositories/user'
import User, { PublicUserView, UserWithoutPassword } from 'models/user'
import { Inject, Service } from 'express-di'
import { ObjectId } from 'mongodb'
import { ServiceError, ValidationError } from 'services/v2/errors'
import QuizRepository from 'repositories/quiz'
import ResultRepository from 'repositories/result'

export type UserRegistrationData = Omit<User,
  '_id' | 'date' | 'quizzes' | 'results'>

@Inject
export default class UserServiceV2 extends Service() {
  constructor(
    private userRepo: UserRepository,
    private quizRepo: QuizRepository,
    private resultRepo: ResultRepository,
  ) {
    super()
  }

  /**
   * Gets a user's data from their id
   */
  async getUserById(
    userId: string | ObjectId,
  ): Promise<UserWithoutPassword | null> {
    const user = await this.userRepo.repo.findById(userId)
    if (user) {
      const { password, ...userData } = user
      return userData
    }
    return null
  }

  /**
   * Gets a {@link PublicUserView user's public data}.
   */
  async getPublicUserById(
    userId: string | ObjectId,
  ): Promise<PublicUserView | null> {
    const user = await this.userRepo.repo.findById(userId)
    if (user) {
      const { email, date, results, password, ...userData } = user
      return userData
    }
    return null
  }

  /**
   * Returns a list of usernames with matching user ids
   */
  async getUsernamesFromIds(
    userIds: Array<string | ObjectId>,
  ): Promise<string[]> {
    return await this.userRepo.getUsernames(userIds)
  }

  /**
   * Returns a list of user ids with matching usernames
   */
  async getIdsFromUsernames(usernames: string[]): Promise<ObjectId[]> {
    return await this.userRepo.getUserIds(usernames)
  }

  /**
   * Gets user's quizzes
   */
  async getUserQuizzes(userId: string | ObjectId): Promise<ObjectId[]> {
    const user = <User>await this.userRepo.repo.findById(userId)
    return user.quizzes
  }

  /**
   * Gets user's results
   */
  async getUserResults(userId: string | ObjectId): Promise<ObjectId[]> {
    const user = <User>await this.userRepo.repo.findById(userId)
    return user.results
  }

  /**
   * Adds a quiz to user's list of created quizzes
   */
  async addQuiz(
    userId: string | ObjectId,
    quizId: string | ObjectId,
  ): Promise<void> {
    await this.userRepo.addQuiz(userId, quizId)
  }

  /**
   * Removes a user's quiz
   */
  async removeQuiz(
    userId: string | ObjectId,
    quizId: string | ObjectId,
  ): Promise<void> {
    await this.userRepo.removeQuiz(userId, quizId)
  }

  /**
   * Adds a a quiz result to user's results
   */
  async addResult(
    userId: string | ObjectId,
    resultId: string | ObjectId,
  ): Promise<void> {
    await this.userRepo.addResult(userId, resultId)
  }

  /**
   * Removes a user's quiz result
   */
  async removeResult(
    userId: string | ObjectId,
    resultId: string | ObjectId,
  ): Promise<void> {
    await this.userRepo.removeResult(userId, resultId)
  }

  /**
   * Authorizes a user, ensuring they exist and present valid credentials.
   *
   * @returns A tuple, where first value is JWT with user id payload if authorized, and
   * the second value being ValidationError if unauthorized.
   */
  async authorizeUser(
    username: string,
    password: string,
  ): Promise<[string | null, ValidationError | null]> {
    // try to find a user with a matching username
    const user = await this.userRepo.findByUsername(username)

    if (!user) {
      return [
        null,
        {
          field: 'username',
          message: 'No matching username found.',
          value: username,
        },
      ]
    } else {
      // check if the password matches the user's password
      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch) {
        return [
          null,
          {
            field: 'password',
            message: 'Invalid credentials.',
          },
        ]
      } else {
        const userId = user._id

        // the jwt will contain the user's id
        const payload = {
          user: {
            id: userId,
          },
        }

        // use jwt to sign the payload with the secret
        const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
          expiresIn: 3600 * 24,
        })

        return [token, null]
      }
    }
  }

  /**
   * Updates the user's email.
   *
   * @return tuple containing success status and an ValidationError explaining what
   * went wrong if the call failed.
   */
  async changeUserEmail(
    userId: string | ObjectId,
    email: string,
  ): Promise<[boolean, ValidationError | null]> {
    const existingUser = await this.userRepo.findByEmail(email)
    if (!existingUser) {
      await this.userRepo.updateEmail(userId, email)
      return [true, null]
    }
    return [
      false,
      {
        field: 'email',
        message: 'Email is already in use.',
        value: email,
      },
    ]
  }

  /**
   * Updates the user's password.
   */
  async changeUserPassword(
    userId: string | ObjectId,
    password: string,
  ): Promise<void> {
    const salt = await bcrypt.genSalt(10)
    const encryptedPass = await bcrypt.hash(password, salt)
    await this.userRepo.updatePassword(userId, encryptedPass)
  }

  /**
   * Registers a new user.
   *
   * @returns A tuple, where first value is JWT with user id payload if successful, and
   * the second value being array of ValidationError if registration failed.
   */
  async registerUser({
                       email,
                       username,
                       password,
                     }: UserRegistrationData): Promise<[string | null, ValidationError[] | null]> {
    const errors: ValidationError[] = []

    // Check if email is already in use
    let existingUser = await this.userRepo.findByEmail(email)
    if (existingUser) {
      errors.push({
        field: 'email',
        message: 'Email is already in use.',
        value: email,
      })
    }

    // Check if username is already in use
    existingUser = await this.userRepo.findByUsername(username)
    if (existingUser) {
      errors.push({
        field: 'username',
        message: 'Username is already in use.',
        value: username,
      })
    }

    // Present user with a JWT on successful registration (no conflicts)
    if (errors.length === 0) {
      let user = new User(username, email, password)

      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(password, salt)

      const userId = await this.userRepo.repo.insert(user)

      const payload = {
        user: {
          id: userId,
        },
      }

      const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
        expiresIn: 3600 * 24,
      })
      return [token, null]
    } else {
      return [null, errors]
    }
  }

  /**
   * Deletes the user and cleans up any data they have ever created, including their
   * quizzes and the results for those quizzes.
   *
   * @throws ServiceError(404) if the user doesn't exist (probably because of duplicate
   * calls to delete in a short timespan).
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepo.repo.findById(userId)
    if (user == null) {
      throw new ServiceError(404)
    }

    // Clean up user's results
    await this.resultRepo.deleteByUserId(userId)

    // Clean up users's quizzes completley including results to those quizzes
    // so clients won't find incomplete data
    // TODO - Update models returned to clients such that raw IDs are definitely never
    // returned so we don't have to delete verything
    await this.resultRepo.deleteIfQuizIdIn(user.quizzes)
    await this.quizRepo.deleteByUserId(userId)

    await this.userRepo.repo.delete(userId)
  }
}
