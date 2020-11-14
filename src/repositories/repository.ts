import Quiz from 'models/quiz'
import Result from 'models/result'
import User from 'models/user'
import {
  Collection,
  Condition,
  FilterQuery,
  ObjectId,
  OptionalId,
  WithId
} from 'mongodb'

export default class Repository<T extends User | Quiz | Result> {
  constructor(public store: Collection<any>) {}

  /**
   * Adds an entity to the repository
   * @param doc entity document
   * @returns Inserted document
   */
  async insert(doc: T): Promise<T> {
    const { ops } = await this.store.insertOne(doc)
    return ops[0]
  }

  /**
   * Finds a single entity by id
   * @param id
   * @returns Quiz data
   */
  async findById(id: string | ObjectId): Promise<T | null> {
    if (!ObjectId.isValid(id)) {
      return null
    }
    return await this.store.findOne({ _id: new ObjectId(id) })
  }

  /**
   * Deletes a single entity by id
   * @param ID
   */
  async delete(id: string | ObjectId): Promise<void> {
    if (!ObjectId.isValid(id)) {
      return
    }
    await this.store.deleteOne({ _id: new ObjectId(id) })
  }

  /**
   * Updates an entire entity
   * @param id
   * @param entity document to replace current values
   */
  async update(id: string | ObjectId, entity: T): Promise<void> {
    if (!ObjectId.isValid(id)) {
      return
    }
    const { _id, ...doc } = entity
    await this.store.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...doc } }
    )
  }
}
