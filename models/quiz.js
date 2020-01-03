exports.Quiz = class Quiz {
  constructor(user, text, questions, allowedUsers, expiresIn, isPublic) {
    this.user = user
    this.text = text
    this.allowedUsers = allowedUsers
    this.questions = questions
    this.responses = 0
    this.isPublic = isPublic
    this.expiresIn = expiresIn
    this.date = new Date().toISOString()
  }
}
