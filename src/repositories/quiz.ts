import { Collection, Filter, ObjectId, WithId } from 'mongodb'
import { Inject, Service } from 'express-di'
import DbService from 'services/db'
import Quiz from 'models/quiz'
import Repository from './repository'

@Inject
export default class QuizRepository extends Service() {
  private _repoBase!: Repository<Quiz>
  private collection!: Collection<Quiz>

  constructor(private db: DbService) {
    super()
  }

  get repo(): Repository<Quiz> {
    return this._repoBase
  }

  onInit() {
    this._repoBase = new Repository<Quiz>(this.db.quizzes)
    this.collection = this.db.quizzes
  }

  /**
   * Adds a quiz result to a quiz
   * @param quiz quiz id
   * @param result
   */
  async addResult(
    quiz: string | ObjectId,
    result: string | ObjectId
  ): Promise<void> {
    if (!ObjectId.isValid(quiz) || !ObjectId.isValid(result)) {
      // TODO throw
      return
    }
    const _id: ObjectId = new ObjectId(quiz)
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
   * Gets all quizzes created by the user with `_id` equal to `user`.
   *
   * @param user id of the user to search by - quizzes with a `user` field
   * equal to this value will be returned.
   */
  async findByUserId(user: string | ObjectId): Promise<WithId<Quiz>[]> {
    if (!ObjectId.isValid(user)) {
      // TODO throw
      return []
    }

    // TODO paging
    return this.collection
      .find({ user: new ObjectId(user) } as Filter<Quiz>)
      .toArray()
  }

  /**
   * Deletes all quizzes created by the user with `_id` equal to `user`.
   *
   * @param user id of the user to search by - quizzes with a `user` field
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
      } as Filter<Quiz>)
    ).deletedCount
  }

  /**
   * Removes a result from the quiz's list of results
   * @param quiz quiz id
   * @param result
   */
  async removeResult(
    quiz: string | ObjectId,
    result: string | ObjectId
  ): Promise<void> {
    if (!ObjectId.isValid(quiz) || !ObjectId.isValid(result)) {
      // TODO throw
      return
    }
    const _id: ObjectId = new ObjectId(quiz)
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
}
