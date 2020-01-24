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
   */
  async addQuiz(user, quiz) {
    const _id = Repository._getObjectIdFromEntity(user)
    const quizId = Repository._getObjectIdFromEntity(quiz)
    if (!_id || !quizId) {
      return
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
   * Updates a user's quiz results
   * @param {User|string|ObjectId} user User or ID of User to modify
   * @param {Result|string|ObjectId} result quiz result or ID of quiz result
   */
  async addResult(user, result) {
    const _id = Repository._getObjectIdFromEntity(user)
    const resultId = Repository._getObjectIdFromEntity(result)
    if (!_id || !resultId) {
      return
    }
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
   * Remove a quiz from User's quizzes
   * @param {User|string|ObjectId} user User or ID of User to modify
   * @param {Quiz|string|ObjectId} quiz Quiz or ID a Quiz to remove
   */
  async removeQuiz(user, quiz) {
    const _id = Repository._getObjectIdFromEntity(user)
    const quizId = Repository._getObjectIdFromEntity(quiz)
    if (!_id || !quizId) {
      return
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
   * Remove a user's quiz result
   * @param {User|string|ObjectId} user User or ID of User to modify
   * @param {Result|string|ObjectId} result Result or ID a Result to remove
   */
  async removeResult(user, result) {
    const _id = Repository._getObjectIdFromEntity(user)
    const resultId = Repository._getObjectIdFromEntity(result)
    if (!_id || !resultId) {
      return
    }
    await this.store.updateOne(
      { _id },
      {
        $pull: {
          results: resultId
        }
      }
    )
  }

  /**
   * Returns an array of usernames with the given ids
   * @param {[string|ObjectId]} ids
   */
  async getUsernames(ids) {
    ids = ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id))
    const users = await this.store
      .find({ _id: { $in: ids } })
      .map(user => user.username)
      .toArray()
    return users
  }

  /**
   * Returns an array of ids from usernames
   * @param {[string|ObjectId]} usernames
   */
  async getUserIds(usernames) {
    const users = await this.store
      .find({ username: { $in: usernames } })
      .map(user => user._id)
      .toArray()
    return users
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

  /**
   * Updates a user's email
   * @param {User|string|ObjectId} user User or User ID to update
   * @param {string} email Email to replace current
   */
  async updateEmail(user, email) {
    const _id = Repository._getObjectIdFromEntity(user)
    await this.store.findOneAndUpdate({ _id }, { $set: { email } })
  }

  /**
   * Updates a user's password
   * @param {User|string|ObjectId} user User or User ID to update
   * @param {string} password password to replace current
   */
  async updatePassword(user, password) {
    const _id = Repository._getObjectIdFromEntity(user)
    await this.store.findOneAndUpdate({ _id }, { $set: { password } })
  }
}
