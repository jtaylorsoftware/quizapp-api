const { ObjectId } = require('mongodb')

exports.Quiz = class Quiz {
  constructor(
    user,
    title,
    expiresIn,
    isPublic = true,
    questions = [],
    allowedUsers = []
  ) {
    this.user = ObjectId.isValid(user) ? new ObjectId(user) : null
    this.title = title
    this.allowedUsers = allowedUsers
    this.questions = questions
    this.completeResponses = []
    this.isPublic = isPublic
    this.expiresIn = expiresIn
    this.date = new Date().toISOString()
  }
}
