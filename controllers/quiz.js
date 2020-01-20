const debug = require('debug')('routes:quiz')

const { Controller } = require('./controller')

class QuizController extends Controller {
  /**
   * Returns a quiz's data as a listing or full format only if signed in user owns quiz
   */
  async getQuiz(req, res, next) {
    const { id: userId } = req.user
    const { id: quizId } = req.params
    const { format } = req.query
    try {
      const quiz = await this.serviceLocator.quiz.getQuizById(quizId)
      if (!quiz) {
        res.status(404).end()
        return next()
      }
      const isQuizOwner = userId === quiz.user.toString()
      if (!isQuizOwner) {
        res.status(403).json({
          errors: [{ msg: 'You are not allowed to view this quiz' }]
        })
        return next()
      }
      if (!format || format === 'full') {
        // convert allowed users to usernames
        const allowedUsers = await this.serviceLocator.user.getUsernamesFromIds(
          quiz.allowedUsers
        )
        quiz.allowedUsers = allowedUsers
        res.json(quiz)
      } else {
        const { questions, results, allowedUsers, ...listing } = quiz
        listing.resultsCount = results.length
        listing.questionCount = questions.length
        res.json(listing)
      }
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }

  /**
   * Returns a quiz as a form for a user to answer
   */
  async getQuizForm(req, res, next) {
    const { id: userId } = req.user
    const { id: quizId } = req.params
    try {
      const quiz = await this.serviceLocator.quiz.getQuizById(quizId)
      if (!quiz) {
        res.status(404).end()
        return next()
      }

      if (!this._canUserViewQuiz(userId, quiz)) {
        res.status(403).json({
          errors: [{ msg: 'You are not allowed to view this quiz' }]
        })
        return next()
      }
      const answerForm = this._convertToAnswerForm(quiz)
      const [username] = await this.serviceLocator.user.getUsernamesFromIds([
        answerForm.user
      ])
      answerForm.user = username
      res.json(answerForm)
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }

  /**
   * Creates a new quiz
   */
  async createQuiz(req, res, next) {
    const { id: userId } = req.user
    const { title, isPublic, questions, ...quiz } = req.body
    const expiresIn = new Date(req.body.expiresIn).toISOString()

    try {
      const user = await this.serviceLocator.user.getUserById(userId)
      if (!user) {
        res.status(400).end()
      }
      const allowedUsers = await this.serviceLocator.user.getIdsFromUsernames(
        quiz.allowedUsers
      )
      const quizId = await this.serviceLocator.quiz.createQuiz({
        user: user._id,
        title,
        expiresIn,
        isPublic,
        questions,
        allowedUsers
      })
      await this.serviceLocator.user.addQuiz(userId, quizId)
      res.json({ id: quizId })
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }

  /**
   * Edits an existing quiz
   */
  async editQuiz(req, res, next) {
    const { user } = req
    const quiz = req.body
    const { id: quizId } = req.params
    if (!this._userOwnsQuiz(user.id, quizId)) {
      return res
        .status(403)
        .json({ errors: [{ msg: 'You are not the owner of this quiz' }] })
    }
    try {
      const allowedUsers = await this.serviceLocator.user.getIdsFromUsernames(
        quiz.allowedUsers
      )
      quiz.allowedUsers = allowedUsers
      await this.serviceLocator.quiz.updateQuiz(quizId, quiz)
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }

    return next()
  }

  /**
   * Deletes a quiz
   */
  async deleteQuiz(req, res, next) {
    const { user } = req
    const { id: quizId } = req.params
    if (!this._userOwnsQuiz(user.id, quizId)) {
      return res
        .status(403)
        .json({ errors: [{ msg: 'You are not the owner of this quiz' }] })
    }
    try {
      await this.serviceLocator.quiz.deleteQuiz(quizId)
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }

  _userOwnsQuiz(userId, quizId) {
    return userId !== quizId
  }

  _canUserViewQuiz(userId, quiz) {
    return (
      quiz.isPublic ||
      quiz.user.toString() === userId ||
      quiz.allowedUsers.some(id => id.toString() === userId)
    )
  }

  _convertToAnswerForm(quiz) {
    const {
      allowedUsers,
      showCorrectAnswers,
      allowMultipleResponses,
      isPublic,
      results,
      ...answerForm
    } = quiz
    for (let i = 0; i < answerForm.questions.length; ++i) {
      const { correctAnswer, ...question } = answerForm.questions[i]
      answerForm.questions[i] = question
    }
    return answerForm
  }
}

exports.QuizController = QuizController
