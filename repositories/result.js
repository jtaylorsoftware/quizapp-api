const { ObjectId } = require('mongodb')

const { Repository } = require('./repository')

exports.ResultRepository = class ResultRepository extends Repository {
  constructor(store) {
    super(store)
  }

  /**
   * Finds a quiz result by the user id and quiz id
   * @param {string} userId
   * @param {string} quizId
   */
  async findByUserAndQuizId(userId, quizId) {
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(quizId)) {
      return null
    }
    return await this.store.findOne({
      user: { $eq: new ObjectId(userId) },
      quiz: { $eq: new ObjectId(quizId) }
    })
  }
}
