import { Repository } from './repository'
import { ObjectId } from 'mongodb'

export class ResultRepository extends Repository {
  /**
   * Finds a quiz result by the user id and quiz id
   * @param userId Id of user that has the result
   * @param quizId Id of quiz that the result is for
   */
  async findByUserAndQuizId(
    userId: string | ObjectId,
    quizId: string | ObjectId
  ): Promise<any | null> {
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(quizId)) {
      return null
    }
    return await this.store.findOne({
      user: { $eq: new ObjectId(userId) },
      quiz: { $eq: new ObjectId(quizId) }
    })
  }
}
