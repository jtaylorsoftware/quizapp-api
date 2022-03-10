import { Collection, ObjectId } from 'mongodb'
import { Inject, Service } from 'express-di'
import DbService from 'services/db'
import User from 'models/user'
import Repository from './repository'

@Inject
export default class UserRepository extends Service() {
  private _repoBase: Repository<User>
  private collection: Collection<User>

  constructor(private db: DbService) {
    super()
  }

  get repo(): Repository<User> {
    return this._repoBase
  }

  onInit() {
    this._repoBase = new Repository<User>(this.db.users)
    this.collection = this.db.users
  }

  /**
   * Updates a user's quizzes
   * @param user User or ID of User to modify
   * @param quiz Quiz or ID a Quiz to add
   */
  async addQuiz(
    user: string | ObjectId,
    quiz: string | ObjectId
  ): Promise<void> {
    if (!ObjectId.isValid(user) || !ObjectId.isValid(quiz)) {
      return
    }
    const _id: ObjectId = new ObjectId(user)
    const quizId: ObjectId = new ObjectId(quiz)
    await this.collection.updateOne(
      { _id },
      {
        $addToSet: {
          quizzes: quizId,
        },
      }
    )
  }

  /**
   * Updates a user's quiz results
   * @param user User or ID of User to modify
   * @param result quiz result or ID of quiz result
   */
  async addResult(
    user: string | ObjectId,
    result: string | ObjectId
  ): Promise<void> {
    if (!ObjectId.isValid(user) || !ObjectId.isValid(result)) {
      return
    }
    const _id: ObjectId = new ObjectId(user)
    const resultId: ObjectId = new ObjectId(result)
    await this.collection.updateOne(
      { _id },
      {
        $addToSet: {
          results: resultId,
        },
      }
    )
  }

  /**
   * Remove a quiz from User's quizzes
   * @param user User or ID of User to modify
   * @param quiz Quiz or ID a Quiz to remove
   */
  async removeQuiz(
    user: string | ObjectId,
    quiz: string | ObjectId
  ): Promise<void> {
    if (!ObjectId.isValid(user) || !ObjectId.isValid(quiz)) {
      return
    }
    const _id: ObjectId = new ObjectId(user)
    const quizId: ObjectId = new ObjectId(quiz)
    await this.collection.updateOne(
      { _id },
      {
        $pull: {
          quizzes: quizId,
        },
      }
    )
  }

  /**
   * Remove a user's quiz result
   * @param user User or ID of User to modify
   * @param result Result or ID a Result to remove
   */
  async removeResult(
    user: string | ObjectId,
    result: string | ObjectId
  ): Promise<void> {
    if (!ObjectId.isValid(user) || !ObjectId.isValid(result)) {
      return
    }
    const _id: ObjectId = new ObjectId(user)
    const resultId: ObjectId = new ObjectId(result)
    await this.collection.updateOne(
      { _id },
      {
        $pull: {
          results: resultId,
        },
      }
    )
  }

  /**
   * Returns an array of usernames with the given ids
   * @param ids
   */
  async getUsernames(ids: Array<string | ObjectId>): Promise<string[]> {
    const objectIds = ids
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id))
    return await this.collection
      .find({ _id: { $in: objectIds } })
      .map((user) => user.username)
      .toArray()
  }

  /**
   * Returns an array of ids from usernames
   * @param usernames
   * @returns ids of users with related usernames
   */
  async getUserIds(usernames: string[]): Promise<ObjectId[]> {
    return await this.collection
      .find({ username: { $in: usernames } })
      .map((user) => user._id)
      .toArray()
  }

  /**
   * Finds a single user by id
   * @param email
   * @returns User entity without sensitive information
   */
  async findByEmail(email: string): Promise<User> {
    return await this.collection.findOne({ email })
  }

  /**
   * Finds a single user by username
   * @param username
   * @returns User entity without sensitive information
   */
  async findByUsername(username: string): Promise<User> {
    return await this.collection.findOne({ username })
  }

  /**
   * Updates a user's email
   * @param user User or User ID to update
   * @param email Email to replace current
   */
  async updateEmail(user: string | ObjectId, email: string): Promise<void> {
    if (!ObjectId.isValid(user)) {
      return
    }
    const _id: ObjectId = new ObjectId(user)
    await this.collection.findOneAndUpdate({ _id }, { $set: { email } })
  }

  /**
   * Updates a user's password
   * @param user User or User ID to update
   * @param password password to replace current
   */
  async updatePassword(
    user: string | ObjectId,
    password: string
  ): Promise<void> {
    if (!ObjectId.isValid(user)) {
      return
    }
    const _id: ObjectId = new ObjectId(user)
    await this.collection.findOneAndUpdate({ _id }, { $set: { password } })
  }
}
