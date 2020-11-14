import { ObjectId } from 'mongodb'

export default class Repository {
  constructor(public store: any) {}

  /**
   * Adds an entity to the repository
   * @param doc entity document
   * @returns Inserted document
   */
  async insert(doc: any): Promise<any> {
    const { ops } = await this.store.insertOne(doc)
    return ops[0]
  }

  /**
   * Finds a single entity by id
   * @param id
   * @returns Quiz data
   */
  async findById(id: string | ObjectId): Promise<any | null> {
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
  async update(id: string | ObjectId, entity: any): Promise<void> {
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
