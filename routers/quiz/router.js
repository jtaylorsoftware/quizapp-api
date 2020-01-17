const debug = require('debug')('routes:quiz')

const { Router } = require('../router')

class QuizRouter extends Router {
  /**
   * Returns a quiz's data as a listing or full format
   */
  async getQuiz(req, res, next) {
    const { user } = req
    const { id: quizId } = req.params
    const { format } = req.query
    try {
      const quiz = await this._controller.getQuizFromId(quizId)
      if (!quiz) {
        res.status(404).end()
        return next()
      }
      if (!this._canUserViewQuiz(user.id, quiz)) {
        res.status(403).json({
          errors: [{ msg: 'You are not allowed to view this quiz' }]
        })
        return next()
      }
      if (!format || format === 'full') {
        res.json(quiz)
      } else {
        const { questions, allowedUsers, ...listing } = quiz
        res.json(listing)
      }
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
    const { user } = req
    const { title, allowedUsers, isPublic, questions } = req.body
    const expiresIn = new Date(req.body.expiresIn)

    try {
      const quizId = await this._controller.createQuiz({
        user: user.id,
        title,
        expiresIn,
        isPublic,
        questions,
        allowedUsers
      })
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
    const { quiz } = req.body
    const { id: quizId } = req.params
    if (!this._userOwnsQuiz(user.id, quizId)) {
      return res
        .status(403)
        .json({ errors: [{ msg: 'You are not the owner of this quiz' }] })
    }
    try {
      await this._controller.updateQuiz(quizId, quiz)
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
      await this._controller.deleteQuiz(quizId, user.id)
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }

  _userOwnsQuiz(userId, quizId) {
    return userId.toString() !== quizId
  }

  _canUserViewQuiz(userId, quiz) {
    return (
      quiz.isPublic ||
      quiz.user.toString() === userId ||
      !quiz.allowedUsers.some(userId => userId.toString() === id)
    )
  }
}

exports.QuizRouter = QuizRouter
