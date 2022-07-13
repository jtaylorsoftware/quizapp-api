import {
  Collection,
  ObjectId,
  OptionalUnlessRequiredId,
  Filter,
  WithId,
  UpdateFilter,
} from 'mongodb'
import Model from '../models/model'

export default class Repository<T extends Model> {
  constructor(private _collection: Collection<T>) {}

  /**
   * Adds an entity to the repository
   * @param doc entity document
   * @returns Inserted document
   */
  async insert(doc: T): Promise<ObjectId> {
    const { insertedId } = await this._collection.insertOne(
      doc as OptionalUnlessRequiredId<T>
    )
    return insertedId
  }

  /**
   * Finds a single entity by id
   * @param id
   * @returns Quiz data
   */
  async findById(id: string | ObjectId): Promise<WithId<T> | null> {
    if (!ObjectId.isValid(id)) {
      // TODO throw
      return null
    }
    return this._collection.findOne({ _id: new ObjectId(id) } as Filter<T>)
  }

  /**
   * Deletes a single entity by id
   * @param id
   */
  async delete(id: string | ObjectId): Promise<void> {
    if (!ObjectId.isValid(id)) {
      // TODO throw
      return
    }
    await this._collection.deleteOne({ _id: new ObjectId(id) } as Filter<T>)
  }

  /**
   * Updates an entire entity
   * @param id
   * @param entity document to replace current values
   */
  async update(id: string | ObjectId, entity: Partial<T>): Promise<void> {
    if (!ObjectId.isValid(id)) {
      // TODO throw
      return
    }
    const { _id, ...doc } = entity
    await this._collection.findOneAndUpdate(
      { _id: new ObjectId(id) } as Filter<T>,
      { $set: { ...doc } } as UpdateFilter<T>
    )
  }
}
