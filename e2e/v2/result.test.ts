import request from 'supertest'

import express from 'express'
import mongo from 'mongodb'

import bootstrap from 'bootstrap-app'

import User from 'models/user'
import Quiz from 'models/quiz'

import { ValidationError } from 'services/v2/errors'
import {
  teacherA,
  studentB,
  clearTestData,
  loadTestData,
  users,
  teacherAQuizzes,
} from '../data'

describe('/api/v2/results', () => {
  let dbClient: mongo.MongoClient
  let app: express.Express

  let db: mongo.Db
  let usersCol: mongo.Collection<User>
  let quizzesCol: mongo.Collection<Quiz>

  beforeAll(async () => {
    ;({ client: dbClient, app: app } = await bootstrap())
    db = await dbClient.db()
    await loadTestData(db)
    usersCol = db.collection('users')
    quizzesCol = db.collection('quizzes')
  })

  afterAll(async () => {
    await clearTestData(db)
    await dbClient.close()
  })

  describe('GET /', () => {
    const username = teacherA.username
    const password = 'password'
    let token = ''
    let quizIds: string[] = []

    const get = (
      quizId?: string,
      userId?: string,
      token?: string,
      format?: string
    ) => {
      const url = `/api/v2/results${quizId != null ? '?quiz=' + quizId : ''}${
        userId != null ? `&user=${userId}` : ''
      }${format != null ? `&format=${format}` : ''}`

      return request(app)
        .get(url)
        .set('x-auth-token', token ?? '')
    }

    beforeAll(async () => {
      // Set up the test harness by authenticating as the teacher user
      // and saving their token, so requests are made as the teacher by default.
      let res = await request(app)
        .post('/api/v2/users/auth')
        .send({ username, password })
      ;({ token } = res.body)

      quizIds = teacherAQuizzes.map((quiz) => quiz._id!.toString())
    })

    it('if no auth token in request returns status 401', async () => {
      await get('abc', '123').expect(401)
    })

    it('if no quiz id in request returns status 400', async () => {
      await get(undefined, undefined, token).expect(400)
    })

    it('returns status 403 when requesting all quiz results if user does not own the quiz', async () => {
      // Get the token for a different user that doesn't own the quiz
      let res = await request(app)
        .post('/api/v2/users/auth')
        .send({ username: studentB.username, password })
      let { token: testToken } = res.body
      res = await get(quizIds[0], undefined, testToken).expect(403)
    })

    it('if userId is not part of query, returns all results for quiz', async () => {
      let quiz = await quizzesCol.findOne({ title: 'public quiz' })

      // @ts-ignore
      let resultCount = quiz.results.length
      expect(resultCount).toBeGreaterThanOrEqual(1)
      // @ts-ignore
      let res = await get(quizIds[0], undefined, token).expect(200)
      expect(res.body.results).toHaveLength(resultCount)
    })

    it('if userId is in the query, returns just the result for the user', async () => {
      // @ts-ignore
      let res = await get(
        quizIds[0],
        users.studentA._id!.toString(),
        token
      ).expect(200)
      expect(res.body.user).toEqual(users.studentA._id!.toString())
    })

    it('returns status 200 and full quiz by default or if format=full ', async () => {
      // @ts-ignore
      const expectFullResult = (result) => {
        expect(result).toHaveProperty('answers')
        expect(result).toHaveProperty('score')
      }

      // default case
      // @ts-ignore
      let res = await get(quizIds[0], undefined, token).expect(200)
      expect(res.body.results).not.toHaveLength(0)
      res.body.results.forEach(expectFullResult)

      // try with full query string
      // @ts-ignore
      await get(quizIds[0], undefined, token, 'full').expect(200)
      expect(res.body.results).not.toHaveLength(0)
      res.body.results.forEach(expectFullResult)
    })

    it('returns results with answers and scores if user owns quiz, format=full, quiz results not published', async () => {
      // @ts-ignore
      const expectResultListing = (result) => {
        expect(result).toHaveProperty('answers')
        expect(result).toHaveProperty('score')
      }

      // quizIds[1] has publishResults set to false
      let res = await get(quizIds[1], undefined, token, 'full').expect(200)
      expect(res.body.results).not.toHaveLength(0)
      res.body.results.forEach(expectResultListing)
    })

    it('returns results without answers or scores if user does not own quiz, format=full, quiz results not published', async () => {
      // Get the token for a different user that doesn't own the quiz
      let authRes = await request(app)
        .post('/api/v2/users/auth')
        .send({ username: studentB.username, password })
      let { token: testToken } = authRes.body

      const studentId = users.studentB._id!.toString()

      // quizIds[1] has publishResults set to false
      let resultRes = await get(
        quizIds[1],
        studentId,
        testToken,
        'full'
      ).expect(200)

      // A single result should be returned since userId is in query, so results should not be an array
      expect(resultRes.body.results).not.toBeDefined()

      const result = resultRes.body
      expect(result).not.toHaveProperty('answers')
      expect(result).not.toHaveProperty('score')
    })

    it('returns status 200 and listings if format=listing', async () => {
      // @ts-ignore
      const expectResultListing = (result) => {
        expect(result).not.toHaveProperty('answers')
        expect(result).toHaveProperty('score')
      }

      // @ts-ignore
      let res = await get(quizIds[0], undefined, token, 'listing').expect(200)
      expect(res.body.results).not.toHaveLength(0)
      res.body.results.forEach(expectResultListing)
    })

    it('returns results without answers but with score if user owns quiz, format=listing, quiz results not published', async () => {
      // @ts-ignore
      const expectResultListing = (result) => {
        expect(result).not.toHaveProperty('answers')
        expect(result).toHaveProperty('score')
      }

      // quizIds[1] has publishResults set to false
      let res = await get(quizIds[1], undefined, token, 'listing').expect(200)
      expect(res.body.results).not.toHaveLength(0)
      res.body.results.forEach(expectResultListing)
    })

    it('returns results without answers or scores if user does not own quiz, format=listing, quiz results not published', async () => {
      // Get the token for a different user that doesn't own the quiz
      let authRes = await request(app)
        .post('/api/v2/users/auth')
        .send({ username: studentB.username, password })
      let { token: testToken } = authRes.body

      const studentId = users.studentB._id!.toString()

      // quizIds[1] has publishResults set to false
      let resultRes = await get(
        quizIds[1],
        studentId,
        testToken,
        'listing'
      ).expect(200)

      // A single result should be returned since userId is in query, so results should not be an array
      expect(resultRes.body.results).not.toBeDefined()

      const result = resultRes.body
      expect(result).not.toHaveProperty('answers')
      expect(result).not.toHaveProperty('score')
    })
  })

  describe('POST /', () => {
    const username = studentB.username
    const password = 'password'
    let token = ''

    const post = (quizId?: string, token?: string) => {
      const url = `/api/v2/results${quizId != null ? '?quiz=' + quizId : ''}`

      return request(app)
        .post(url)
        .set('x-auth-token', token ?? '')
    }

    beforeAll(async () => {
      let res = await request(app)
        .post('/api/v2/users/auth')
        .send({ username, password })

      ;({ token } = res.body)
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
      // @ts-ignore
      await post(teacherAQuizzes[0]._id, token).send({}).expect(400)
    })

    it('if answer choice sent are not numbers returns status 400', async () => {
      // @ts-ignore
      await post(teacherAQuizzes[0]._id, token)
        .send({ answers: [{ choice: 'str' }] })
        .expect(400)
    })

    it('if answers are valid returns status 200', async () => {
      // @ts-ignore
      await post(teacherAQuizzes[0]._id, token)
        .send({ answers: [{ choice: 0 }] })
        .expect(200)
    })

    it("if result for user exists returns status 400 and error 'duplicate'", async () => {
      // @ts-ignore
      let res = await post(teacherAQuizzes[1]._id, token).send({
        answers: [{ choice: 0 }],
      })
      expect(res.body.errors).toBeDefined()
      expect(
        res.body.errors.some((err: ValidationError) =>
          err.message!.includes('already responded')
        )
      ).toBeTruthy()
    })
  })
})
