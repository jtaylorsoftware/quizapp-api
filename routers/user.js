const debug = require('debug')('routes:user')
const jwt = require('jsonwebtoken')

const { Router } = require('./router')

class UserRouter extends Router {
  /**
   * Returns an authenticated user's info without sensitive info,
   * @param {object} req request object
   * @param {{ id: string }} req.user user with id property
   */
  async getUserData(req, res, next) {
    try {
      const user = await this._controller.getUserFromId(req.user.id)
      res.json(user)
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }
  /**
   * Returns the user's quizzes as either listing or full data.
   * By default, full if no query string supplied.
   * @param {object} req request object
   * @param {object} req.query request query object
   * @param {string} req.query.format string describing if format is full or listing
   */
  async getUsersQuizzes(req, res, next) {
    const { format } = req.query
    const user = req.user.id
    try {
      let quizzes
      if (!format || format === 'full') {
        quizzes = await this._controller.getUserQuizzes(user)
      } else {
        quizzes = await this._controller.getUserQuizListings(user)
      }

      res.json(quizzes)
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }

  /**
   * Updates the authenticated user's email
   * @param {object} req request object
   * @param {{ id: string }} req.user user with id property
   * @param {object} req.body json body of request
   * @param {string} req.body.email the new email to use
   */
  async changeUserEmail(req, res, next) {
    const user = req.user.id
    const { email } = req.body
    try {
      const emailWasSet = await this._controller.changeUserEmail(user, email)
      if (!emailWasSet) {
        return res.status(400).json({ errors: [{ msg: 'Email in use' }] })
      }
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }

  /**
   * Updates the authenticated user's password
   * @param {object} req request object
   * @param {{ id: string }} req.user user with id property
   * @param {object} req.body json body of request
   * @param {string} req.body.password the new password to use
   */
  async changeUserPassword(req, res, next) {
    const user = req.user.id
    const { password } = req.body
    try {
      await this._controller.changeUserPassword(user, password)
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }

  /**
   * Deletes a user
   * @param {object} req request object
   * @param {{ id: string }} req.user user with id property
   */
  async deleteUser(req, res, next) {
    try {
      await this._controller.deleteUser(req.user.id)
      res.status(204).end()
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }

  /**
   * Returns a user by their id without their email, password, or registration date
   * @param {object} req request object
   * @param {object} req.params request params
   * @param {string} req.params.id id of user to find
   */
  async getUserById(req, res, next) {
    try {
      const userData = await this._controller.getUserFromId(req.params.id)
      if (!userData) {
        res.status(404).end()
        return next()
      }
      const { email, date, ...user } = userData
      res.json(user)
    } catch (error) {
      debug(error)
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }

  /**
   * Authorizes a user
   * @param {object} req request object
   * @param {object} req.body json body of request
   * @param {string} req.body.username the user's username
   * @param {string} req.body.password the user's password
   */
  async authorizeUser(req, res, next) {
    const { username, password } = req.body
    try {
      const userId = await this._controller.authorizeUser(username, password)
      if (!userId) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] })
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
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }

  /**
   * Registers a user
   * @param {object} req request object
   * @param {object} req.body json body of request
   * @param {string} req.body.username the user's username
   * @param {string} req.body.password the user's password
   * @param {string} req.body.email the user's email
   */
  async registerUser(req, res, next) {
    const { username, email, password } = req.body
    try {
      const [userId, errors] = await this._controller.registerUser({
        username,
        email,
        password
      })

      if (!userId) {
        res.status(400).json({ errors: [...errors] })
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
      res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
    }
    return next()
  }
}

exports.UserRouter = UserRouter
