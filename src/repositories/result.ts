import { Collection, Filter, ObjectId, WithId } from 'mongodb'
import { Inject, Service } from 'express-di'
import DbService from 'services/db'
import Result from 'models/result'
import Repository from './repository'

@Inject
export default class ResultRepository extends Service() {
  private _repoBase!: Repository<Result>
  private collection!: Collection<Result>

  constructor(private db: DbService) {
    super()
  }

  get repo(): Repository<Result> {
    return this._repoBase
  }

  onInit() {
    this._repoBase = new Repository<Result>(this.db.results)
    this.collection = this.db.results
  }

  /**
   * Finds a quiz result by the user id and quiz id
   * @param userId Id of user that has the result
   * @param quizId Id of quiz that the result is for
   */
  async findByUserAndQuizId(
    userId: string | ObjectId,
    quizId: string | ObjectId
  ): Promise<Result | null> {
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(quizId)) {
      // TODO throw
      return null
    }
    return await this.collection.findOne({
      user: new ObjectId(userId),
      quiz: new ObjectId(quizId),
    })
  }

  /**
   * Finds all quiz results with the given quiz id
   * @param quizId Id of quiz that the result is for
   */
  async findAllByQuizId(quizId: string | ObjectId): Promise<Result[]> {
    if (!ObjectId.isValid(quizId)) {
      // TODO throw
      return []
    }
    return await this.collection
      .find({
        quiz: new ObjectId(quizId),
      })
      .toArray()
  }

  /**
   * Gets all quiz results for the user with `_id` equal to `user`.
   *
   * @param user id of the user to search by - results with a `user` field
   * equal to this value will be returned.
   */
  async findByUserId(user: string | ObjectId): Promise<WithId<Result>[]> {
    if (!ObjectId.isValid(user)) {
      // TODO throw
      return []
    }

    // TODO paging
    return this.collection
      .find({ user: new ObjectId(user) } as Filter<Result>)
      .toArray()
  }

  /**
   * Deletes all quiz results for the user with `_id` equal to `user`.
   *
   * @param user id of the user to search by - results with a `user` field
   * equal to this value will be deleted.
   *
   * @returns Count deleted.
   */
  async deleteByUserId(user: string | ObjectId): Promise<number> {
    if (!ObjectId.isValid(user)) {
      // TODO throw
      return 0
    }

    return (
      await this.collection.deleteMany({
        user: new ObjectId(user),
      } as Filter<Result>)
    ).deletedCount
  }

  /**
   * Deletes all quiz results for the quiz with `_id` equal to `quiz`.
   *
   * @param quiz id of the quiz to search by - results with a `quiz` field
   * equal to this value will be deleted.
   *
   * @returns Count deleted.
   */
  async deleteByQuizId(quiz: string | ObjectId): Promise<number> {
    if (!ObjectId.isValid(quiz)) {
      // TODO throw
      return 0
    }

    return (
      await this.collection.deleteMany({
        quiz: new ObjectId(quiz),
      } as Filter<Result>)
    ).deletedCount
  }

  /**
   * Deletes quiz results by their `quiz` value.
   *
   * @param quizIds IDs of the quizzes to search by - results with a `quiz` field
   * equal to any of these values will be deleted.
   *
   * @returns Count deleted.
   */
  async deleteIfQuizIdIn(quizIds: string[] | ObjectId[]): Promise<number> {
    if (quizIds.some((id) => !ObjectId.isValid(id))) {
      // TODO throw
      return 0
    }

    const ids = quizIds.map((id) => new ObjectId(id))

    return (
      await this.collection.deleteMany({
        quiz: { $in: ids },
      } as Filter<Result>)
    ).deletedCount
  }
}
