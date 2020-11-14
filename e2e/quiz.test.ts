import request from 'supertest'

import express from 'express'
import mongo from 'mongodb'

import bootstrap from 'bootstrap-app'
import Quiz from 'models/quiz'

import { teacher, extraUser } from './setup'
import moment from 'moment'

describe('/api/quizzes', () => {
  let dbClient: mongo.MongoClient
  let app: express.Express

  let db: mongo.Db
  let quizzes: mongo.Collection<Quiz>

  beforeAll(async () => {
    ;({ client: dbClient, app: app } = await bootstrap())
    db = await dbClient.db()
    quizzes = db.collection('quizzes')
  })

  afterAll(async () => {
    await dbClient.close()
  })

  describe('GET /:id', () => {
    const username = teacher.username
    const password = 'password'
    let token = ''

    const get = (id: string, token?: string, format?: string) => {
      const url =
        `/api/quizzes/${id}` + (format != null ? `?format=${format}` : '')
      return request(app)
        .get(url)
        .set('x-auth-token', token ?? '')
    }

    beforeAll(async () => {
      let res = await request(app)
        .post('/api/users/auth')
        .send({ username, password })
      ;({ token } = res.body)
    })

    it('if no auth token in request returns status 401', async () => {
      await get('abc').expect(401)
    })

    it('if user does not own quiz returns status 403', async () => {
      let res = await request(app)
        .post('/api/users/auth')
        .send({ username: extraUser.username, password })
      let { token } = res.body

      const quiz = await quizzes.findOne({ title: 'public quiz' })

      res = await get(quiz._id.toHexString(), token).expect(403)
    })

    it('by default or if format=full returns status 200 and full quiz', async () => {
      const expectQuizIsFull = quiz => {
        expect(quiz).toHaveProperty('allowedUsers')
        expect(quiz).toHaveProperty('results')
        expect(quiz).toHaveProperty('questions')
      }

      const quiz = await quizzes.findOne({ title: 'public quiz' })

      let res = await get(quiz._id.toHexString(), token).expect(200)
      expectQuizIsFull(res.body)

      res = await get(quiz._id.toHexString(), token, 'full').expect(200)
      expectQuizIsFull(res.body)
    })

    it('if format=listing returns status 200 and quiz in listing format', async () => {
      const expectQuizIsListing = quiz => {
        expect(quiz).toHaveProperty('resultsCount')
        expect(quiz).toHaveProperty('questionCount')
        expect(quiz).not.toHaveProperty('allowedUsers')
        expect(quiz).not.toHaveProperty('results')
        expect(quiz).not.toHaveProperty('questions')
      }

      const quiz = await quizzes.findOne({ title: 'public quiz' })

      const res = await get(quiz._id.toHexString(), token, 'listing').expect(
        200
      )
      expectQuizIsListing(res.body)
    })

    describe('/form', () => {
      const get = (id: string, token?: string) => {
        const url = `/api/quizzes/${id}/form`
        return request(app)
          .get(url)
          .set('x-auth-token', token ?? '')
      }

      const expectIsAnswerForm = quiz => {
        expect(quiz).not.toHaveProperty('allowedUsers')
        expect(quiz).not.toHaveProperty('showCorrectAnswers')
        expect(quiz).not.toHaveProperty('allowMultipleResponses')
        expect(quiz).not.toHaveProperty('isPublic')
        expect(quiz).not.toHaveProperty('results')
      }

      it('if no auth token in request returns status 401', async () => {
        await get('abc').expect(401)
      })

      it('if user owns public quiz returns the quiz form', async () => {
        const quiz = await quizzes.findOne({ title: 'public quiz' })
        const res = await get(quiz._id.toHexString(), token).expect(200)
        expectIsAnswerForm(res.body)
      })

      it('if user owns private quiz returns the quiz form', async () => {
        const quiz = await quizzes.findOne({ title: 'private quiz' })
        const res = await get(quiz._id.toHexString(), token).expect(200)
        expectIsAnswerForm(res.body)
      })

      it('if quiz is public returns the quiz form for any user', async () => {
        let res = await request(app)
          .post('/api/users/auth')
          .send({ username: extraUser.username, password })

        let { token } = res.body
        const quiz = await quizzes.findOne({ title: 'private quiz' })
        res = await get(quiz._id.toHexString(), token).expect(200)
        expectIsAnswerForm(res.body)
      })

      it('if user is in allowedUsers list of private quiz returns the quiz form', async () => {
        let res = await request(app)
          .post('/api/users/auth')
          .send({ username: extraUser.username, password })

        let { token } = res.body
        const quiz = await quizzes.findOne({ title: 'private quiz' })
        res = await get(quiz._id.toHexString(), token).expect(200)
        expectIsAnswerForm(res.body)
      })
    })
  })

  describe('POST /', () => {
    const username = extraUser.username
    const password = 'password'
    let token = ''

    const post = (token?: string) => {
      return request(app)
        .post('/api/quizzes/')
        .set('x-auth-token', token ?? '')
    }

    beforeAll(async () => {
      let res = await request(app)
        .post('/api/users/auth')
        .send({ username, password })
      ;({ token } = res.body)
    })

    it('if no auth token in request returns status 401', async () => {
      await post().expect(401)
    })

    it('if no quiz is in request returns status 400 and errors', async () => {
      const res = await post(token).send({}).expect(400)
      expect(res.body).toHaveProperty('errors')

      // expected error object keys
      const errorNames = new Set([
        'title',
        'isPublic',
        'expiration',
        'allowedUsers',
        'questions'
      ])
      expect(res.body.errors).toHaveLength(errorNames.size)

      // expect every error to have a key in set errorNames
      res.body.errors.forEach(error => {
        const keys = new Set(Object.keys(error))
        keys.forEach(key => {
          if (key !== 'value') {
            expect(errorNames.has(key)).toBe(true)
          }
        })
      })
    })

    it('if an allowed username is invalid returns status 400 and only allowedUsers error', async () => {
      const res = await post(token)
        .send({
          title: 'test quiz',
          isPublic: false,
          expiration: moment().add(1, 'd').toISOString(),
          questions: [
            {
              text: 'q1',
              correctAnswer: 0,
              answers: [{ text: 'a1' }, { text: 'a2' }]
            }
          ],
          allowedUsers: ['reallylongusernamethatisnotvalid']
        })
        .expect(400)
      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors).toHaveLength(1)
      expect(res.body.errors[0]).toHaveProperty('allowedUsers')
    })

    it('if a question is missing a correct answer returns status 400 and questions error', async () => {
      const res = await post(token)
        .send({
          title: 'test quiz',
          isPublic: true,
          expiration: moment().add(1, 'd').toISOString(),
          questions: [
            {
              text: 'q1',
              answers: [{ text: 'a1' }, { text: 'a2' }]
            }
          ],
          allowedUsers: []
        })
        .expect(400)
      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors).toHaveLength(1)
      expect(res.body.errors[0]).toHaveProperty('questions')
    })

    it('if a question answer is missing text returns status 400 and questions error', async () => {
      const res = await post(token)
        .send({
          title: 'test quiz',
          isPublic: true,
          expiration: moment().add(1, 'd').toISOString(),
          questions: [
            {
              text: 'q1',
              correctAnswer: 1,
              answers: [{}, { text: 'a2' }]
            }
          ],
          allowedUsers: []
        })
        .expect(400)
      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors).toHaveLength(1)
      expect(res.body.errors[0]).toHaveProperty('questions')
    })

    it('if expiration date is in past returns status 400 and expiration error', async () => {
      const res = await post(token)
        .send({
          title: 'test quiz',
          isPublic: false,
          expiration: moment().subtract(1, 'd').toISOString(),
          questions: [
            {
              text: 'q1',
              correctAnswer: 0,
              answers: [{ text: 'a1' }, { text: 'a2' }]
            }
          ],
          allowedUsers: []
        })
        .expect(400)
      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors).toHaveLength(1)
      expect(res.body.errors[0]).toHaveProperty('expiration')
    })

    it('if quiz is valid returns status 200 and quiz id', async () => {
      const res = await post(token)
        .send({
          title: 'test quiz',
          isPublic: true,
          expiration: moment().add(1, 'd').toISOString(),
          questions: [
            {
              text: 'q1',
              correctAnswer: 0,
              answers: [{ text: 'a1' }, { text: 'a2' }]
            }
          ],
          allowedUsers: []
        })
        .expect(200)
      expect(res.body).toHaveProperty('id')
    })
  })

  describe('PUT :id/edit', () => {
    const username = extraUser.username
    const password = 'password'
    let token = ''

    const put = (id: string, token?: string) => {
      return request(app)
        .put(`/api/quizzes/${id}/edit`)
        .set('x-auth-token', token ?? '')
    }

    beforeAll(async () => {
      let res = await request(app)
        .post('/api/users/auth')
        .send({ username, password })
      ;({ token } = res.body)
    })

    it('if no auth token in request returns status 401', async () => {
      await put('abc').expect(401)
    })

    it('if quiz does not exist returns status 400', async () => {
      await put('abc', token).expect(400)
    })

    it('if user does not own quiz returns status 403', async () => {
      let res = await request(app)
        .post('/api/users/auth')
        .send({ username: teacher.username, password })

      let { token } = res.body
      const quiz = await quizzes.findOne({ title: 'test quiz' })

      await put(quiz._id.toHexString(), token).send(quiz).expect(403)
    })

    it('if title is empty in edits returns status 400 and errors', async () => {
      const quiz = await quizzes.findOne({ title: 'test quiz' })

      const res = await put(quiz._id.toHexString(), token)
        .send({
          ...quiz,
          title: ''
        })
        .expect(400)
      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors).toHaveLength(1)
      expect(res.body.errors[0]).toHaveProperty('title')
    })

    it('if isPublic is missing returns status 400 and errors', async () => {
      const quiz = await quizzes.findOne({ title: 'test quiz' })
      delete quiz.isPublic

      const res = await put(quiz._id.toHexString(), token)
        .send(quiz)
        .expect(400)
      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors).toHaveLength(1)
      expect(res.body.errors[0]).toHaveProperty('isPublic')
    })

    it('if allowedUsers has an invalid username returns status 400 and errors', async () => {
      const { allowedUsers, ...quiz } = await quizzes.findOne({
        title: 'test quiz'
      })
      quiz['allowedUsers'] = [...allowedUsers, 'a really invalid username']

      const res = await put(quiz._id.toHexString(), token)
        .send(quiz)
        .expect(400)
      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors).toHaveLength(1)
      expect(res.body.errors[0]).toHaveProperty('allowedUsers')
    })

    it('if questions are missing returns status 400 and errors', async () => {
      const quiz = await quizzes.findOne({ title: 'test quiz' })
      delete quiz.questions

      const res = await put(quiz._id.toHexString(), token)
        .send(quiz)
        .expect(400)
      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors).toHaveLength(1)
      expect(res.body.errors[0]).toHaveProperty('questions')
    })

    it('if questions are missing correct answers status 400 and errors', async () => {
      const quiz: any = await quizzes.findOne({ title: 'test quiz' })
      quiz.questions = [
        {
          text: 'question',
          answers: [{ text: 'a1' }, { text: 'a2' }]
        }
      ]

      const res = await put(quiz._id.toHexString(), token)
        .send(quiz)
        .expect(400)
      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors).toHaveLength(1)
      expect(res.body.errors[0]).toHaveProperty('questions')
    })

    it('if a question has invalid answers returns status 400 and errors', async () => {
      const quiz: any = await quizzes.findOne({ title: 'test quiz' })
      quiz.questions = [
        {
          text: 'question',
          answers: [{}]
        }
      ]

      const res = await put(quiz._id.toHexString(), token)
        .send(quiz)
        .expect(400)
      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors).toHaveLength(1)
      expect(res.body.errors[0]).toHaveProperty('questions')
    })

    it('if a question correctAnswer has changed returns status 409 and errors', async () => {
      const quiz = await quizzes.findOne({ title: 'test quiz' })
      quiz.questions[0].correctAnswer =
        (quiz.questions[0].correctAnswer + 1) % quiz.questions[0].answers.length

      const res = await put(quiz._id.toHexString(), token)
        .send(quiz)
        .expect(409)
      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors).toHaveLength(1)
      expect(res.body.errors[0]).toHaveProperty('questions')
    })

    it('if a question has been added returns status 409 and errors', async () => {
      const quiz: any = await quizzes.findOne({ title: 'test quiz' })
      quiz.questions.push({
        text: 'q2',
        correctAnswer: 0,
        answers: [{ text: 'a' }, { text: 'b' }]
      })

      const res = await put(quiz._id.toHexString(), token)
        .send(quiz)
        .expect(409)
      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors).toHaveLength(1)
      expect(res.body.errors[0]).toHaveProperty('questions')
    })

    it('if an answer has been added to a question returns status 409 and errors', async () => {
      const quiz: any = await quizzes.findOne({ title: 'test quiz' })
      quiz.questions[0] = {
        ...quiz.questions[0],
        answers: [
          ...quiz.questions[0].answers,
          {
            text: 'abc'
          }
        ]
      }
      const res = await put(quiz._id.toHexString(), token)
        .send(quiz)
        .expect(409)
      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors).toHaveLength(1)
      expect(res.body.errors[0]).toHaveProperty('questions')
    })
  })

  describe('DELETE /:id', () => {
    const username = extraUser.username
    const password = 'password'
    let token = ''

    const deleteQuiz = (id: string, token?: string) => {
      return request(app)
        .delete(`/api/quizzes/${id}`)
        .set('x-auth-token', token ?? '')
    }

    beforeAll(async () => {
      let res = await request(app)
        .post('/api/users/auth')
        .send({ username, password })
      ;({ token } = res.body)
    })

    it('if no auth token in request returns status 401', async () => {
      await deleteQuiz('abc123').expect(401)
    })

    it('if quiz does not exist returns error 404', async () => {
      await deleteQuiz('abc', token).expect(404)
    })

    it('if user does not own quiz returns error 403', async () => {
      let res = await request(app)
        .post('/api/users/auth')
        .send({ username: teacher.username, password })

      let { token } = res.body
      const quiz = await quizzes.findOne({ title: 'test quiz' })

      await deleteQuiz(quiz._id.toHexString(), token).expect(403)
    })

    it('if user does own quiz returns status 204', async () => {
      const quiz = await quizzes.findOne({ title: 'test quiz' })
      await deleteQuiz(quiz._id.toHexString(), token).expect(204)
    })
  })
})
