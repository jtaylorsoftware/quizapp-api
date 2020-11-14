import { ObjectId } from 'mongodb'

export default abstract class Model {
  _id?: ObjectId
  date: string
  constructor() {
    this.date = new Date().toISOString()
  }
}
