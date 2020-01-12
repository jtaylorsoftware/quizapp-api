const { ObjectId } = require('mongodb')

exports.Repository = class Repository {
  constructor(store) {
    this.store = store
  }

  /**
   * Adds an entity to the repository
   * @param {Object} doc entity document
   * @returns {Object} Inserted document
   */
  async insert(quiz) {
    const { ops } = await this.store.insertOne(quiz)
    return ops[0]
  }

  /**
   * Finds a single entity by id
   * @param {String} id
   * @returns {Object} Quiz data
   */
  async findById(id) {
    if (!ObjectId.isValid(id)) {
      return null
    }
    return await this.store.findOne({ _id: new ObjectId(id) })
  }

  /**
   * Deletes a single entity by id
   * @param {Object} ID
   */
  async delete(id) {
    await this.store.deleteOne({ _id: id })
  }

  static _getObjectIdFromEntity(entity) {
    return entity._id || (ObjectId.isValid(entity) ? new ObjectId(entity) : '')
  }
}
