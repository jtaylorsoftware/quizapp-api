exports.User = class User {
  constructor(username, email, password) {
    this.username = username
    this.email = email
    this.password = password
    this.quizzes = []
    this.date = new Date().toISOString()
  }
}
