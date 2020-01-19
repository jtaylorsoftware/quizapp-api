const async = require('async')

const { Result } = require('../models/result')

class ResultService {
  constructor(resultRepository) {
    this._resultRepository = resultRepository
  }

  async getUserResult(userId, quizId) {
    const result = await this._resultRepository.findByUserAndQuizId(
      userId,
      quizId
    )
    return result
  }

  async createResult(answers, userId, quiz) {
    const errors = []
    // check if user and quiz exist
    // const user = await this._userRepository.findById(userId)
    // const quiz = await this._quizRepository.findById(quizId)

    // if (!user) {
    //   errors.push('user')
    // }
    // if (!quiz) {
    //   errors.push('quiz')
    // }
    // if (errors.length > 0) {
    //   return [null, errors]
    // }

    if (!quiz.allowMultipleResponses) {
      const duplicateResult = await async.some(quiz.results, async resultId => {
        const result = await this._resultRepository.findById(resultId)
        return result && result.user.toString() === userId
      })
      if (duplicateResult) {
        errors.push('duplicate')
        return [null, errors]
      }
    }

    const questions = quiz.questions
    if (answers.length !== questions.length) {
      errors.push('answers')
      return [null, errors]
    }

    let score = 0
    for (let i = 0; i < questions.length; ++i) {
      const question = questions[i]
      const answer = answers[i]

      if (answer.choice >= question.answers.length) {
        errors.push(`answer ${i + 1}`)
      } else {
        const correctAnswer = question.correctAnswer
        answer.isCorrect = correctAnswer === answer.choice
        if (answer.isCorrect) {
          score += 1 / answers.length
        }
        if (quiz.showCorrectAnswers) {
          answer.correctAnswer = correctAnswer
        }
      }
    }
    let result = {}
    if (errors.length === 0) {
      result = await this._resultRepository.insert(
        new Result(userId, quiz._id, quiz.user, answers, score)
      )
      // await this._userRepository.addResult(userId, result._id)
      // await this._quizRepository.addResult(quiz, result._id)
    }

    return [result._id, errors]
  }
}

exports.ResultService = ResultService
