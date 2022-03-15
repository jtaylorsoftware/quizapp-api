import { ObjectId, WithId } from 'mongodb'
import Model from './model'

export type UserWithoutPassword = Omit<WithId<User>, 'password'>

/**
 * Represents a user document
 * @property username
 * @property email
 * @property password
 */
export default class User extends Model {
  quizzes: ObjectId[] = []
  results: ObjectId[] = []

  constructor(
    public username: string,
    public email: string,
    public password: string,
  ) {
    super()
  }
}
