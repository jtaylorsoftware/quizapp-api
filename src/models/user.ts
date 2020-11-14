import { ObjectId } from 'mongodb'
import Model from './model'

/**
 * Represents a user document
 * @property username
 * @property email
 * @property password
 */
export default class User extends Model {
  quizzes: ObjectId[]
  results: ObjectId[]
  constructor(
    public username: string,
    public email: string,
    public password: string
  ) {
    super()
    this.username = username
    this.email = email
    this.password = password
    this.quizzes = []
    this.results = []
  }
}
