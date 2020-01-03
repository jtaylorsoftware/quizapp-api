const omit = require('object.omit')
const { ObjectId } = require('mongodb')
const { Repository } = require('./repository')

exports.UserRepository = class UserRepository extends Repository {
  /**
   * Create a repository with a User collection as backing store
   * @param {collection} store Mongodb collection containing User docs
   */
  constructor(store) {
    super(store)
  }

  /**
   * Updates a user's quizzes
   * @param {User|string|ObjectId} user User or ID of User to modify
   * @param {Quiz|string|ObjectId} quiz Quiz or ID a Quiz to add
   * @returns {Object} User data without sensitive information
   */
  async addQuiz(user, quiz) {
    const _id = user._id || (ObjectId.isValid(user) ? new ObjectId(user) : '')
    const quizId =
      quiz._id || (ObjectId.isValid(quiz) ? new ObjectId(quiz) : '')
    if (!_id || !quizId) {
      return null
    }
    await this.store.updateOne(
      { _id },
      {
        $addToSet: {
          quizzes: quizId
        }
      }
    )
  }

  /**
   * Remove a quiz from User's quizzes
   * @param {User|string|ObjectId} user User or ID of User to modify
   * @param {Quiz|string|ObjectId} quiz Quiz or ID a Quiz to remove
   * @returns {Object} User data without sensitive information
   */
  async removeQuiz(user, quiz) {
    const _id = user._id || (ObjectId.isValid(user) ? new ObjectId(user) : '')
    const quizId =
      quiz._id || (ObjectId.isValid(quiz) ? new ObjectId(quiz) : '')
    if (!_id || !quizId) {
      return null
    }
    await this.store.updateOne(
      { _id },
      {
        $pull: {
          quizzes: quizId
        }
      }
    )
  }

  /**
   * Finds a single user by id
   * @param {String} email
   * @returns {User} User entity without sensitive information
   */
  async findByEmail(email) {
    return await this.store.findOne({ email })
  }

  /**
   * Finds a single user by username
   * @param {String} username
   * @returns {User} User entity without sensitive information
   */
  async findByUsername(username) {
    return await this.store.findOne({ username })
  }
}
