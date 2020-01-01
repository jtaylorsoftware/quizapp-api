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
   * @param {User} user
   * @returns {Object} User data without sensitive information
   */
  async insert(user) {
    try {
      const { ops } = await this.store.insertOne(user)
      return ops[0]
    } catch (error) {
      throw error
    }
  }

  /**
   * Updates a user in the repository
   * @param {User} user User with existing id to modify
   * @returns {Object} User data without sensitive information
   */
  async update(user) {
    try {
      const { ops } = await this.store.updateOne(
        { _id: new ObjectId(user._id) },
        {
          $set: {
            ...omit(user, '_id')
          }
        }
      )
      return ops[0]
    } catch (error) {
      throw error
    }
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
