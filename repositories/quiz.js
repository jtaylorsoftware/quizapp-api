const { ObjectId } = require('mongodb')

const MIN_QUESTIONS = 1
const MIN_ANSWERS = 2

exports.MIN_QUESTIONS = MIN_QUESTIONS
exports.MIN_ANSWERS = MIN_ANSWERS

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

  async updateTitle(quiz, title) {
    if (!(title instanceof String) && title.length <= 0) {
      throw Error('Text must be a String')
    }
    await this.store.updateOne(
      { _id: quiz._id },
      {
        $set: {
          title
        }
      }
    )
  }

  async updateOptions(quiz, options) {
    const { expiresIn, isPublic } = options
    await this.store.updateOne(
      { _id: quiz._id },
      {
        $set: {
          expiresIn,
          isPublic
        }
      }
    )
  }

  async incrementResponseCount(quiz) {
    await this.store.updateOne(
      { _id: quiz._id },
      {
        $inc: {
          responses: 1
        }
      }
    )
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
    await this.store.updateOne(
      { _id: quiz._id },
      {
        $set: {
          allowedUsers
        }
      }
    )
  }

  /**
   * Updates and replaces the questions of a quiz in the repository
   * @param {Quiz} quiz Quiz with existing id to modify
   * @param {Object[]} questions Array of Questions
   * @returns {Quiz} Quiz data
   */
  async updateQuestions(quiz, questions) {
    if (!QuizRepository.validateQuestions(questions)) {
      throw Error('Questions are invalid')
    }
    await this.store.updateOne(
      { _id: quiz._id },
      {
        $set: {
          questions
        }
      }
    )
  }

  async updateQuestionText(quiz, questionIndex, text) {
    this._assertQuestionIndexInRange(quiz.questions, questionIndex)
    await this.store.updateOne(
      { _id: quiz._id },
      {
        $set: {
          [`questions.${questionIndex}.text`]: text
        }
      }
    )
  }

  async updateQuestionAnswerText(quiz, questionIndex, answerIndex, text) {
    this._assertQuestionIndexInRange(quiz.questions, questionIndex)
    this._assertAnswerIndexInRange(
      quiz.questions[questionIndex].answers,
      answerIndex
    )

    await this.store.updateOne(
      { _id: quiz._id },
      {
        $set: {
          [`questions.${questionIndex}.answers.${answerIndex}.text`]: text
        }
      }
    )
  }

  async incrementQuestionAnswerCount(quiz, questionIndex, answerIndex) {
    this._assertQuestionIndexInRange(quiz.questions, questionIndex)
    this._assertAnswerIndexInRange(
      quiz.questions[questionIndex].answers,
      answerIndex
    )
    await this.store.updateOne(
      { _id: quiz._id },
      {
        $inc: {
          [`questions.${questionIndex}.answers.${answerIndex}.count`]: 1
        }
      }
    )
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

  /**
   * Deletes a quiz
   * @param {Object} Quiz to delete
   */
  async delete(quiz) {
    await this.store.deleteOne({ _id: quiz._id })
  }

  static validateQuiz(quiz) {
    return (
      typeof quiz.title === 'string' &&
      quiz.title.length > 0 &&
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
      questions.length > MIN_QUESTIONS &&
      questions.every(question => this.validateQuestion(question))
    )
  }

  static validateQuestion(question) {
    return (
      typeof question.text === 'string' &&
      question.text.length > 0 &&
      Number.isInteger(question.answer) &&
      question.answers instanceof Array &&
      question.answers.length >= MIN_ANSWERS &&
      question.answers.every(answer => this.validateAnswer(answer))
    )
  }

  static validateAnswer(answer) {
    return typeof answer.text === 'string'
  }

  async _findOne(query) {
    return await this.store.findOne(query)
  }

  _assertQuestionIndexInRange(questions, questionIndex) {
    if (!Number.isInteger(questionIndex) || questionIndex < 0) {
      throw Error('questionIndex must be a non-negative integer')
    }
    if (questionIndex > questions.length) {
      throw Error('questionIndex must be less than number of questions')
    }
  }

  _assertAnswerIndexInRange(answers, answerIndex) {
    if (!Number.isInteger(answerIndex) || answerIndex < 0) {
      throw Error('answerIndex must be a non-negative integer')
    }
    if (answerIndex > answers.length) {
      throw Error('answerIndex must be less than number of questions')
    }
  }
}
