import { Collection, ObjectId } from 'mongodb'
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
      return null
    }
    return await this.collection.findOne({
      user: { $eq: new ObjectId(userId) },
      quiz: { $eq: new ObjectId(quizId) },
    })
  }
}
