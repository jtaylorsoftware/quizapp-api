import Model from './model'

/**
 * Represents a user document
 * @property username
 * @property email
 * @property password
 */
export default class User extends Model {
  quizzes: string[]
  results: string[]
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
