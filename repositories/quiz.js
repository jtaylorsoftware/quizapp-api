const { ObjectId } = require('mongodb')

exports.QuizRepository = class QuizRepository {
  constructor(store) {
    this.store = store
  }

  /**
   * Adds a user to the repository
   * @param {Quiz} quiz
   * @returns {Object} Quiz data
   * @throws Throws Error if Quiz has no questions or any allowedUser is not an ObjectId
   */
  async insert(quiz) {
    if (!QuizRepository.validateQuiz(quiz)) {
      throw Error('One or more parts of the quiz are invalid')
    }
    const { ops } = await this.store.insertOne(quiz)
    return ops[0]
  }

  async updateText(quiz, text) {
    if (!(text instanceof String) || !text.length) {
      throw Error('Text must be a String')
    }
    const { ops } = await this.store.updateOne(
      { _id: new ObjectId(quiz._id) },
      {
        $set: {
          text
        }
      }
    )
    return ops[0]
  }

  async updateOptions(quiz, options) {
    const { expiresIn, isPublic } = options
    const { ops } = await this.store.updateOne(
      { _id: new ObjectId(quiz._id) },
      {
        $set: {
          expiresIn,
          isPublic
        }
      }
    )
    return ops[0]
  }

  /**
   * Updates and replaces the allowed users of a quiz in the repository
   * @param {Quiz} quiz Quiz with existing id to modify
   * @param {String[]} allowedUsers Array of userIds
   * @returns {Object} Quiz data
   */
  async updateAllowedUsers(quiz, allowedUsers) {
    if (
      quiz.private &&
      !QuizRepository.validateAllowedUsers(quiz.allowedUsers)
    ) {
      throw Error('Invalid User Id in quiz.allowedUsers')
    }
    const { ops } = await this.store.updateOne(
      { _id: new ObjectId(quiz._id) },
      {
        $set: {
          allowedUsers
        }
      }
    )
    return ops[0]
  }

  /**
   * Updates and replaces the questions of a quiz in the repository
   * @param {Quiz} quiz Quiz with existing id to modify
   * @param {Object[]} questions Array of Questions
   * @param {String} question.text
   * @returns {Quiz} Quiz data
   */
  async updateQuestions(quiz, questions) {
    if (!QuizRepository.validateQuestions(questions)) {
      throw Error('Questions are invalid')
    }
    const { ops } = await this.store.updateOne(
      { _id: new ObjectId(quiz._id) },
      {
        $set: {
          questions
        }
      }
    )
    return ops[0]
  }

  /**
   * Finds and returns all quizzes that aren't private
   * @returns {Object[]} Quiz data
   */
  async getAllPublicQuizzes() {
    return await this.store.find({ isPublic: true }).toArray()
  }

  /**
   * Finds a single quiz by id
   * @param {String} id
   * @returns {Object} Quiz data
   */
  async findById(id) {
    if (!ObjectId.isValid(id)) {
      return null
    }
    return await this._findOne({ _id: new ObjectId(id) })
  }

  static validateQuiz(quiz) {
    return (
      typeof quiz.text === 'string' &&
      quiz.text.length > 0 &&
      this.validateQuestions(quiz.questions) &&
      (!quiz.private || this.validateAllowedUsers(quiz.allowedUsers))
    )
  }

  static validateAllowedUsers(allowedUsers) {
    return (
      allowedUsers instanceof Array &&
      allowedUsers.length > 0 &&
      allowedUsers.every(userId => this.validateUser(userId))
    )
  }

  static validateUser(userId) {
    return ObjectId.isValid(userId)
  }

  static validateQuestions(questions) {
    return (
      questions instanceof Array &&
      questions.length > 0 &&
      questions.every(question => this.validateQuestion(question))
    )
  }

  static validateQuestion(question) {
    return (
      typeof question.text === 'string' &&
      question.text.length > 0 &&
      Number.isInteger(question.answer) &&
      question.answers instanceof Array &&
      question.answers.length >= 2 &&
      question.answers.every(answer => this.validateAnswer(answer))
    )
  }

  static validateAnswer(answer) {
    return typeof answer.text === 'string'
  }

  async _findOne(query) {
    return await this.store.findOne(query)
  }
}
