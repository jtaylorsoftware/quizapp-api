const { ObjectId } = require('mongodb')

exports.Quiz = class Quiz {
  constructor(user, title, questions, allowedUsers, expiresIn, isPublic) {
    this.user = ObjectId.isValid(user) ? new ObjectId(user) : null
    this.title = title
    this.allowedUsers = allowedUsers
    this.questions = questions
    this.responses = 0
    this.isPublic = isPublic
    this.expiresIn = expiresIn
    this.date = new Date().toISOString()
  }
}
