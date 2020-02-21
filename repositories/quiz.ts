import { ObjectId } from 'mongodb'
import { Repository } from './repository'

export const MIN_QUESTIONS: number = 1
export const MIN_ANSWERS: number = 2

export class QuizRepository extends Repository {
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
    await this.store.updateOne(
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
    await this.store.updateOne(
      { _id },
      {
        $pull: {
          results: resultId
        }
      }
    )
  }
}
