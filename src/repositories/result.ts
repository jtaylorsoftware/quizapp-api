import { ObjectId } from 'mongodb'
import { Inject, Service } from 'express-di'
import Repository from './repository'
import DbService from 'services/db'
import Result from 'models/result'

@Inject
export default class ResultRepository extends Service() {
  private _repo: Repository<Result>

  constructor(private db: DbService) {
    super()
  }

  get repo(): Repository<Result> {
    return this._repo
  }

  onInit() {
    this._repo = new Repository(this.db.results)
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
    return await this._repo.store.findOne({
      user: { $eq: new ObjectId(userId) },
      quiz: { $eq: new ObjectId(quizId) }
    })
  }
}
