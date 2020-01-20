const debug = require('debug')('routes:result')

const { Controller } = require('./controller')

class ResultController extends Controller {
  /**
   * Gets a user's or all results for a quiz as listings or full
   */
  async getResult(req, res, next) {
    const { id: userId } = req.user
    const { format, user: queryUser, quiz: quizId } = req.query
    try {
      if (!queryUser) {
        // get all results for the quiz
        const quiz = await this.serviceLocator.quiz.getQuizById(quizId)
        if (quiz) {
          if (quiz.user !== userId) {
            res.status(403).end()
            return next()
          }
        } else {
          res.status(500).end()
          return next()
        }
      } else {
        const result = await this.serviceLocator.result.getUserResult(
          queryUser,
          quizId
        )
        if (!result) {
          res.status(404).end()
          return next()
        }
        const isResultOwner = result.user.toString() === userId
        const isQuizOwner = result.quizOwner.toString() === userId
        if (!isResultOwner && !isQuizOwner) {
          res.status(403).end()
          return next()
        }
        // get the quiz title and created by
        const quiz = await this.serviceLocator.quiz.getQuizById(quizId)
        if (quiz) {
          result.quizTitle = quiz.title
          const owner = await this.serviceLocator.user.getUserById(
            result.quizOwner
          )
          if (owner) {
            result.ownerUsername = owner.username
          }
        }
        if (!format || format === 'full') {
          res.json(result)
        } else {
          const { answers, ...listing } = result
          res.json(listing)
        }
      }
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }

  /**
   * Posts a response to a quiz
   */
  async postResult(req, res, next) {
    const { id: userId } = req.user
    const { answers } = req.body
    const { quiz: quizId } = req.query

    try {
      const quiz = await this.serviceLocator.quiz.getQuizById(quizId)

      if (!quiz) {
        res.status(404).end()
        return next()
      }
      if (
        !quiz.isPublic &&
        !quiz.allowedUsers.some(id => id.toString() === userId)
      ) {
        res.status(403).end()
        return next()
      }
      const [resultId, errors] = await this.serviceLocator.result.createResult(
        answers,
        userId,
        quiz
      )

      if (!resultId) {
        res.status(400).json({ errors: [...errors] })
        return next()
      }
      await this.serviceLocator.quiz.addResult(quiz._id, resultId)
      res.json({ id: resultId })
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }
}

exports.ResultController = ResultController
