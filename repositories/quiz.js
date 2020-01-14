const { ObjectId } = require('mongodb')
const { Repository } = require('./repository')

const MIN_QUESTIONS = 1
const MIN_ANSWERS = 2

exports.MIN_QUESTIONS = MIN_QUESTIONS
exports.MIN_ANSWERS = MIN_ANSWERS

exports.QuizRepository = class QuizRepository extends Repository {
  constructor(store) {
    super(store)
  }
  /**
   * Adds a quiz to the repository
   * @param {Quiz} quiz
   * @returns {Object} Quiz data
   * @throws Throws Error if Quiz has no questions or any allowedUser is not an ObjectId
   */
  async insert(quiz) {
    if (!QuizRepository.validateQuiz(quiz)) {
      throw Error('One or more parts of the quiz are invalid')
    }
    return await super.insert(quiz)
  }

  /**
   * Finds and returns all quizzes that aren't private
   * @returns {Object[]} Quiz data
   */
  async getAllPublicQuizzes() {
    return await this.store.find({ isPublic: true }).toArray()
  }

  /**
   * Updates the title of a quiz
   * @param {Quiz} quiz quiz object
   * @param {string} title
   */
  async updateTitle(quiz, title) {
    QuizRepository._assertIsValidText(title)
    await this.store.updateOne(
      { _id: quiz._id },
      {
        $set: {
          title
        }
      }
    )
  }

  /**
   * Updates the options of a quiz
   * @param {Quiz} quiz quiz object
   * @param {Object} options object containing relevant options (expiresIn, isPublic)
   */
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
      allowedUsers.every(userId => ObjectId.isValid(userId))
    )
  }

  static validateQuestions(questions) {
    return (
      questions instanceof Array &&
      questions.length >= MIN_QUESTIONS &&
      questions.every(q => ObjectId.isValid(q))
    )
  }

  static _assertQuestionIndexInRange(questions, questionIndex) {
    if (!Number.isInteger(questionIndex) || questionIndex < 0) {
      throw Error('questionIndex must be a non-negative integer')
    }
    if (questionIndex > questions.length) {
      throw Error('questionIndex must be less than number of questions')
    }
  }

  static _assertIsValidText(text) {
    if (!(text instanceof String) && text.length <= 0) {
      throw Error('Text must be a String')
    }
  }
}
