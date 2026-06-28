import { ObjectId, WithId } from 'mongodb'
import Model from './model'

export type UserWithoutPassword = Omit<WithId<User>, 'password'>

export type PublicUserView = Omit<
  UserWithoutPassword,
  'email' | 'date' | 'results'
>

export type UserRole = 'teacher' | 'student'
export const ALLOWED_ROLES_ANY: UserRole[] = ['teacher', 'student']

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
    public role: UserRole
  ) {
    super()
  }
}
