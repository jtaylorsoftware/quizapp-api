const { Repository } = require('./repository')

const MIN_ANSWERS = 2

exports.MIN_ANSWERS = MIN_ANSWERS

exports.QuestionRepository = class QuestionRepository extends Repository {
  constructor(store) {
    super(store)
  }

  /**
   * Adds a question to the repository
   * @param {Question} question
   * @returns {Object} Question data
   * @throws Throws Error if Question is invalid
   */
  async insert(question) {
    if (!QuestionRepository.validateQuestion(question)) {
      throw Error('One or more parts of the question are invalid')
    }
    return await super.insert(question)
  }

  async updateText(question, text) {
    QuestionRepository._assertIsValidText(text)

    await this.store.updateOne(
      { _id: question._id },
      {
        $set: {
          text
        }
      }
    )
  }

  async updateAnswerText(question, answerIndex, text) {
    this._assertQuestionIndexInRange(quiz.questions, questionIndex)
    this._assertAnswerIndexInRange(
      quiz.questions[questionIndex].answers,
      answerIndex
    )

    await this.store.updateOne(
      { _id: question._id },
      {
        $set: {
          [`answers.${answerIndex}.text`]: text
        }
      }
    )
  }

  static validateQuestion(question) {
    return (
      typeof question.text === 'string' &&
      question.text.length > 0 &&
      Number.isInteger(question.correctAnswer) &&
      question.answers instanceof Array &&
      question.answers.length >= MIN_ANSWERS &&
      question.answers.every(answer => this.validateAnswer(answer))
    )
  }

  static validateAnswer(answer) {
    return typeof answer.text === 'string'
  }

  static _assertAnswerIndexInRange(answers, answerIndex) {
    if (!Number.isInteger(answerIndex) || answerIndex < 0) {
      throw Error('answerIndex must be a non-negative integer')
    }
    if (answerIndex > answers.length) {
      throw Error('answerIndex must be less than number of questions')
    }
  }

  static _assertIsValidText(text) {
    if (!(text instanceof String) && text.length <= 0) {
      throw Error('Text must be a String')
    }
  }
}
