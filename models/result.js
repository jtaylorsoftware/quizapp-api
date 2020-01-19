const { ObjectId } = require('mongodb')

/**
 * Represents a quiz result document
 * @property {string} user id of user submitting result
 * @property {string} quiz id of quiz the result is for
 * @property {string} quizOwner id of owner of the quiz
 * @property {[{ choice: string }]} answers
 * @property {number} score the computed score (percent correct)
 */
exports.Result = class Result {
  constructor(user, quiz, quizOwner, answers, score) {
    this.user = ObjectId.isValid(user) ? new ObjectId(user) : null
    this.quiz = ObjectId.isValid(quiz) ? new ObjectId(quiz) : null
    this.quizOwner = ObjectId.isValid(quizOwner)
      ? new ObjectId(quizOwner)
      : null
    this.answers = answers
    this.score = score
    this.date = new Date().toISOString()
  }
}
