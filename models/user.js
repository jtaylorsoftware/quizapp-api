/**
 * Represents a user document
 * @property {string} username
 * @property {string} email
 * @property {string} password
 */
exports.User = class User {
  constructor(username, email, password) {
    this.username = username
    this.email = email
    this.password = password
    this.quizzes = []
    this.results = []
    this.date = new Date().toISOString()
  }
}
