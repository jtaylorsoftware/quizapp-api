const debug = require('debug')('routes:result')

const { Controller } = require('./controller')

class ResultController extends Controller {
  /**
   * Gets a user's or all results for a quiz as listings or full
   */
  async getResult(req, res, next) {
    const { user: authUser } = req
    const { format, user: queryUser, quiz: quizId } = req.query
    try {
      if (!queryUser) {
        // get all results
      }
      const result = await this._service.getUserResult(queryUser, quizId)
      if (!result) {
        res.status(404).end()
        return next()
      }
      if (
        result.user.toString() !== authUser.id &&
        result.quizOwner.toString() !== authUser.id
      ) {
        res.status(403).end()
        return next()
      }
      if (!format || format === 'full') {
        res.json(result)
      } else {
        const { answers, ...listing } = result
        res.json(listing)
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
    const { user } = req
    const { answers } = req.body
    const { quiz: quizId } = req.query

    try {
      const [resultId, errors] = await this._service.createResult({
        user: user.id,
        quizId,
        answers
      })

      if (!resultId) {
        res.status(400).json({ errors: [...errors] })
        return next()
      }
      res.json({ id: resultId })
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }
}

exports.ResultController = ResultController
