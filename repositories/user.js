const omit = require('object.omit')
const { ObjectId } = require('mongodb')

exports.UserRepository = class UserRepository {
  /**
   * Create a repository with a User collection as backing store
   * @param {collection} store Mongodb collection containing User docs
   */
  constructor(store) {
    this.store = store
  }

  /**
   * Adds a user to the repository
   * @param {User} user User model object to insert
   * @returns {Object} User data without sensitive information
   */
  async insert(user) {
    const { ops } = await this.store.insertOne(user)
    return ops[0]
  }

  /**
   * Updates a user in the repository
   * @param {User|string|ObjectId} user User or ID of User to modify
   * @param {Object} quizId ObjectId of a Quiz to add
   * @returns {Object} User data without sensitive information
   */
  async addQuiz(user, quizId) {
    const _id = user._id || (ObjectId.isValid(user) ? new ObjectId(user) : '')
    if (!_id) {
      return null
    }
    const { result } = await this.store.updateOne(
      { _id },
      {
        $addToSet: {
          quizzes: quizId
        }
      }
    )
    console.log(result)
  }

  /**
   * Finds a single user by id
   * @param {String} id
   * @returns {User} User entity without sensitive information
   */
  async findById(id) {
    if (!ObjectId.isValid(id)) {
      return null
    }
    return await this._findOne({ _id: new ObjectId(id) })
  }

  /**
   * Finds a single user by id
   * @param {String} email
   * @returns {User} User entity without sensitive information
   */
  async findByEmail(email) {
    return await this._findOne({ email })
  }

  /**
   * Finds a single user by username
   * @param {String} username
   * @returns {User} User entity without sensitive information
   */
  async findByUsername(username) {
    return await this._findOne({ username })
  }

  async _findOne(query) {
    return await this.store.findOne(query)
  }
}
