import { ObjectId } from 'mongodb'
import { Inject, Service } from 'express-di'
import Repository from './repository'
import DbService from 'services/db'

export const MIN_QUESTIONS: number = 1
export const MIN_ANSWERS: number = 2

@Inject
export default class QuizRepository extends Service() {
  private _repo: Repository

  constructor(private db: DbService) {
    super()
  }

  get repo(): Repository {
    return this._repo
  }

  onInit() {
    this._repo = new Repository(this.db.quizzes)
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
      return
    }
    const _id: ObjectId = new ObjectId(quiz)
    const resultId: ObjectId = new ObjectId(result)
    await this._repo.store.updateOne(
      { _id },
      {
        $addToSet: {
          results: resultId
        }
      }
    )
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
      return
    }
    const _id: ObjectId = new ObjectId(quiz)
    const resultId: ObjectId = new ObjectId(result)
    await this._repo.store.updateOne(
      { _id },
      {
        $pull: {
          results: resultId
        }
      }
    )
  }
}
