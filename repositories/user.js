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
   * Gets all Users
   * @returns {[User]} All Users without sensitive information
   */
  async getAll() {
    return await this._findAll()
  }

  /**
   * Finds a single user by id
   * @returns {User} User entity without sensitive information
   */
  async findById(id) {
    if (!ObjectId.isValid(id)) {
      return null
    }
    return await this._findOne({ id })
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
    return await this.store.findOne(query, { projection: { password: 0 } })
  }

  async _findAll() {
    return await this.store.find({}, { projection: { password: 0 } })
  }
}
