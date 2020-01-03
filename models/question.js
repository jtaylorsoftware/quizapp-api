exports.Question = class Question {
  constructor(text, correctAnswer = 0, answers = []) {
    this.text = text
    this.correctAnswer = correctAnswer
    this.answers = answers
    this.responses = []
  }
}
