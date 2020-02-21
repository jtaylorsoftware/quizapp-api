const debug = require('debug')('routes:user')
const jwt = require('jsonwebtoken')

const { Controller } = require('./controller')

export class UserController extends Controller {
  /**
   * Returns an authenticated user's info without sensitive info,
   * @param req request object
   * @param req.user user with id property
   */
  async getUserData(req, res, next) {
    try {
      const user = await this.serviceLocator.user.getUserById(req.user.id)
      if (!user) {
        res.status(401).end()
        return next()
      }
      res.json(user)
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }
  /**
   * Returns the user's quizzes as either listing or full data.
   * By default, full if no query string supplied.
   * @param req request object
   * @param req.query request query object
   * @param req.query.format string describing if format is full or listing
   */
  async getUsersQuizzes(req, res, next) {
    const { format } = req.query
    const { id: userId } = req.user
    try {
      const quizIds = await this.serviceLocator.user.getUserQuizzes(userId)
      if (quizIds.length === 0) {
        res.json([])
        return next()
      }
      const quizzes = []
      for (const id of quizIds) {
        const quiz = await this.serviceLocator.quiz.getQuizById(id)
        if (quiz) {
          if (!format || format === 'full') {
            // convert allowed users to usernames
            const allowedUsers = await this.serviceLocator.user.getUsernamesFromIds(
              quiz.allowedUsers
            )
            quiz.allowedUsers = allowedUsers
            quizzes.push(quiz)
          } else {
            const { questions, results, allowedUsers, ...listing } = quiz
            listing.resultsCount = results.length
            listing.questionCount = questions.length
            quizzes.push(listing)
          }
        }
      }

      res.json(quizzes)
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Returns the user's results for all quizzes as listing or full format.
   * @param req request object
   * @param req.query request query object
   * @param req.query.format string describing if format is full or listing
   */
  async getUsersResults(req, res, next) {
    const { format } = req.query
    const { id: userId } = req.user
    try {
      const resultIds = await this.serviceLocator.user.getUserResults(userId)
      if (resultIds.length === 0) {
        res.json([])
        return next()
      }
      const results = []
      for (const id of resultIds) {
        const result = await this.serviceLocator.result.getResult(id)
        if (result) {
          // get the quiz title and created by
          const quiz = await this.serviceLocator.quiz.getQuizById(result.quiz)
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
            results.push(result)
          } else {
            const { answers, ...listing } = result
            results.push(listing)
          }
        }
      }

      res.json(results)
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Updates the authenticated user's email
   * @param req request object
   * @param req.user user with id property
   * @param req.body json body of request
   * @param req.body.email the new email to use
   */
  async changeUserEmail(req, res, next) {
    const user = req.user.id
    const { email } = req.body
    try {
      const emailWasSet = await this.serviceLocator.user.changeUserEmail(
        user,
        email
      )
      if (!emailWasSet) {
        res.status(409).json({
          errors: [{ email: 'Email is already in use.', value: email }]
        })
        return next()
      }
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Updates the authenticated user's password
   * @param req request object
   * @param req.user user with id property
   * @param req.body json body of request
   * @param req.body.password the new password to use
   */
  async changeUserPassword(req, res, next) {
    const user = req.user.id
    const { password } = req.body
    try {
      await this.serviceLocator.user.changeUserPassword(user, password)
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Deletes a user
   * @param req request object
   * @param req.user user with id property
   */
  async deleteUser(req, res, next) {
    const userId = req.user.id
    try {
      const user = await this.serviceLocator.user.getUserById(userId)
      if (!user) {
        res.status(404).end()
        return next()
      }
      // Clean up user's results
      const results = user.results
      for (const resultId of results) {
        const result = await this.serviceLocator.result.getResult(resultId)
        if (result) {
          const quiz = await this.serviceLocator.quiz.getQuizById(result.quiz)
          if (quiz) {
            await this.serviceLocator.quiz.removeResult(quiz._id, resultId)
          }
          await this.serviceLocator.result.deleteResult(resultId)
        }
      }
      // Clean up users's quizzes completley including results to those quizzes
      const quizzes = user.quizzes
      for (const quizId of quizzes) {
        const quiz = await this.serviceLocator.quiz.getQuizById(quizId)
        if (quiz) {
          const quizResults = quiz.results
          for (const resultId of quizResults) {
            const result = await this.serviceLocator.result.getResult(resultId)
            if (result) {
              await this.serviceLocator.result.deleteResult(resultId)
              await this.serviceLocator.user.removeResult(result.user, result)
            }
          }
          await this.serviceLocator.quiz.deleteQuiz(quizId)
        }
      }

      await this.serviceLocator.user.deleteUser(userId)
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Returns a user by their id without their email, password, or registration date
   * @param req request object
   * @param req.params request params
   * @param req.params.id id of user to find
   */
  async getUserById(req, res, next) {
    try {
      const userData = await this.serviceLocator.user.getUserById(req.params.id)
      if (!userData) {
        res.status(404).end()
        return next()
      }
      const { email, date, results, ...user } = userData
      res.json(user)
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Authorizes a user
   * @param req request object
   * @param req.body json body of request
   * @param req.body.username the user's username
   * @param req.body.password the user's password
   */
  async authorizeUser(req, res, next) {
    const { username, password } = req.body
    try {
      const [userId, errors] = await this.serviceLocator.user.authorizeUser(
        username,
        password
      )
      if (!userId) {
        return res.status(400).json({ errors: errors })
      }
      // the jwt will contain the user's id
      const payload = {
        user: {
          id: userId
        }
      }

      // use jwt to sign the payload with the secret
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: 3600 * 24
      })
      res.json({ token })
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }

  /**
   * Registers a user
   * @param req request object
   * @param req.body json body of request
   * @param req.body.username the user's username
   * @param req.body.password the user's password
   * @param req.body.email the user's email
   */
  async registerUser(req, res, next) {
    const { username, email, password } = req.body
    try {
      const [userId, errors] = await this.serviceLocator.user.registerUser({
        username,
        email,
        password
      })

      if (!userId) {
        res.status(409).json({ errors: [...errors] })
        return next()
      }

      const payload = {
        user: {
          id: userId
        }
      }

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: 3600 * 24
      })
      res.json({ token })
    } catch (error) {
      debug(error)
      res.status(500).end()
    }
    return next()
  }
}
