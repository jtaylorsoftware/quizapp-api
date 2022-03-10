import { Collection, ObjectId } from 'mongodb'
import { Inject, Service } from 'express-di'
import DbService from 'services/db'
import Quiz from 'models/quiz'
import Repository from './repository'

export const MIN_QUESTIONS: number = 1
export const MIN_ANSWERS: number = 2

@Inject
export default class QuizRepository extends Service() {
  private _repoBase: Repository<Quiz>
  private collection: Collection<Quiz>

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
