const { ObjectId } = require('mongodb')

/**
 * Representation of a Quiz document
 * @property {string} user id of owner
 * @property {title} title of quiz
 * @property {string} expiresIn expiration date of quiz (as ISO string)
 * @property {boolean} isPublic can anyone with link view quiz
 * @property {[any]} questions Array of questions
 * @property {boolean} showCorrectAnswers should results contain the correct answers
 * @property {boolean} allowMultipleResponses should multiple responses be used
 */
exports.Quiz = class Quiz {
  constructor(
    user,
    title,
    expiresIn,
    isPublic = true,
    questions = [],
    allowedUsers = [],
    showCorrectAnswers = false, // TODO - in validation and client allow user to toggle
    allowMultipleResponses = false // TODO - in validation and client allow user to toggle
  ) {
    this.user = ObjectId.isValid(user) ? new ObjectId(user) : null
    this.title = title
    this.allowedUsers = allowedUsers
    this.questions = questions
    this.results = []
    this.showCorrectAnswers = showCorrectAnswers
    this.allowMultipleResponses = allowMultipleResponses
    this.isPublic = isPublic
    this.expiresIn = expiresIn
    this.date = new Date().toISOString()
  }
}
