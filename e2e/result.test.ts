import request from 'supertest'

import express from 'express'
import mongo from 'mongodb'

import { configApp } from 'server'

import User from 'models/user'
import Quiz from 'models/quiz'

import { teacher, extraUser } from './setup'

describe('/api/results', () => {
  let dbClient: mongo.MongoClient
  let app: express.Express

  let db: mongo.Db
  let users: mongo.Collection<User>
  let quizzes: mongo.Collection<Quiz>

  beforeAll(async () => {
    ;({ client: dbClient, app: app } = await configApp())
    db = await dbClient.db()
    users = db.collection('users')
    quizzes = db.collection('quizzes')
  })

  afterAll(async () => {
    await dbClient.close()
  })

  describe('GET /', () => {
    const username = teacher.username
    const password = 'password'
    let token = ''
    let userId = ''
    let quizIds = []

    const get = (
      quizId?: string,
      userId?: string,
      token?: string,
      format?: string
    ) => {
      const url = `/api/results${quizId != null ? '?quiz=' + quizId : ''}${
        userId != null ? `&user=${userId}` : ''
      }${format != null ? `&format=${format}` : ''}`

      return request(app)
        .get(url)
        .set('x-auth-token', token ?? '')
    }

    beforeAll(async () => {
      let res = await request(app)
        .post('/api/users/auth')
        .send({ username, password })
      ;({ token } = res.body)

      let user = await users.findOne({ username: `${teacher.username}` })
      userId = user._id.toString()
      quizIds = user.quizzes.map(id => id.toString())
    })

    it('if no auth token in request returns status 401', async () => {
      await get('abc', '123').expect(401)
    })

    it('if no quiz id in request returns status 400', async () => {
      await get().expect(400)
    })

    it('if user does not own quiz returns status 403', async () => {
      let res = await request(app)
        .post('/api/users/auth')
        .send({ username: extraUser.username, password })
      let { token } = res.body

      res = await get(quizIds[0], undefined, token).expect(403)
    })

    it('if userId is not part of query, returns all results for quiz', async () => {
      let quiz = await quizzes.findOne({ title: 'public quiz' })

      let resultCount = quiz.results.length
      expect(resultCount).toBeGreaterThanOrEqual(1)

      let res = await get(quizIds[0], undefined, token).expect(200)
      expect(res.body.results).toHaveLength(resultCount)
    })

    it('if userId is in the query, returns just the result for the user', async () => {
      let res = await get(quizIds[0], userId, token).expect(200)
      expect(res.body.user).toEqual(userId)
    })

    it('by default or if format=full returns status 200 and full quiz', async () => {
      const expectFullResult = result => {
        expect(result).toHaveProperty('answers')
      }

      // default case
      let res = await get(quizIds[0], undefined, token).expect(200)
      res.body.results.forEach(expectFullResult)

      // try with full query string
      await get(quizIds[0], undefined, token, 'full').expect(200)
      res.body.results.forEach(expectFullResult)
    })

    it('if format=listing returns status 200 and listings', async () => {
      const expectResultListing = result => {
        expect(result).not.toHaveProperty('answers')
      }

      let res = await get(quizIds[0], undefined, token, 'listing').expect(200)
      res.body.results.forEach(expectResultListing)
    })
  })

  describe('POST /', () => {
    const username = teacher.username
    const password = 'password'
    let token = ''
    let userId = ''
    let quizIds = []

    const post = (quizId?: string, token?: string) => {
      const url = `/api/results${quizId != null ? '?quiz=' + quizId : ''}`

      return request(app)
        .post(url)
        .set('x-auth-token', token ?? '')
    }

    beforeAll(async () => {
      let res = await request(app)
        .post('/api/users/auth')
        .send({ username, password })

      ;({ token } = res.body)

      let user = await users.findOne({ username: `${teacher.username}` })
      userId = user._id.toString()
      quizIds = user.quizzes.map(id => id.toString())
    })

    it('if no auth token in request returns status 401', async () => {
      await post('abc').send().expect(401)
    })

    it('if no quiz id in request returns status 400', async () => {
      await post(undefined, token)
        .send({ answers: [{ choice: 0 }] })
        .expect(400)
    })

    it('if no answers are given returns status 400', async () => {
      await post(quizIds[0], token).send({}).expect(400)
    })

    it('if answer choice sent are not numbers returns status 400', async () => {
      await post(quizIds[0], token)
        .send({ answers: [{ choice: 'str' }] })
        .expect(400)
    })

    it('if answers are valid returns status 200', async () => {
      await post(quizIds[1], token)
        .send({ answers: [{ choice: 0 }] })
        .expect(200)
    })

    it("if result for user exists returns status 400 and error 'duplicate'", async () => {
      let res = await post(quizIds[1], token).send({
        answers: [{ choice: 0 }]
      })
      console.log(res.body.errors)
      expect(res.body.errors.some(err => err === 'duplicate')).toBeTruthy()
    })
  })
})
