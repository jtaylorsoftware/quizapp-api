import request from 'supertest'

import jwt from 'jsonwebtoken'
import express from 'express'
import mongo, { ObjectId } from 'mongodb'

import { configApp } from 'server'
import User from 'models/user'

import { teacher, student } from './setup'

describe('/api/users', () => {
  let dbClient: mongo.MongoClient
  let app: express.Express

  let db: mongo.Db
  let users: mongo.Collection<User>

  beforeAll(async () => {
    ;({ client: dbClient, app: app } = await configApp())
    db = await dbClient.db()
    users = db.collection('users')
  })

  afterAll(async () => {
    await dbClient.close()
  })

  describe('POST /', () => {
    afterEach(async () => {
      await users.deleteOne({ username: 'testuser' })
    })

    it('with valid user registration returns status 200 and a jwt token', async () => {
      const username = 'testuser'
      const res = await request(app)
        .post('/api/users/')
        .send({
          username,
          password: 'password',
          email: 'testuseremail@email.com'
        })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body).toHaveProperty('token')
      const decodedToken = jwt.decode(res.body.token)
      const user = await users.findOne({ username })
      expect(decodedToken.user.id).toEqual(`${user._id}`)
    })

    it('if username is already in use returns status 409 and errors', async () => {
      const username = teacher.username
      const res = await request(app)
        .post('/api/users/')
        .send({
          username,
          password: 'password',
          email: 'testuseremail@email.com'
        })
        .expect('Content-Type', /json/)
        .expect(409)

      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors[0]).toHaveProperty('username')
    })

    it('if email is already in use returns status 409 and errors', async () => {
      const username = 'testuser'
      const res = await request(app)
        .post('/api/users/')
        .send({
          username,
          password: 'password',
          email: teacher.email
        })
        .expect('Content-Type', /json/)
        .expect(409)

      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors[0]).toHaveProperty('email')
    })

    it('if username is < 5 chars returns status 400 and errors', async () => {
      const username = 'a'.repeat(4)
      const res = await request(app)
        .post('/api/users/')
        .send({
          username,
          password: 'password',
          email: 'testuseremail@email.com'
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors[0]).toHaveProperty('username')
      expect(await users.findOne({ username })).toBeNull()
    })

    it('if username is > 12 chars returns status 400 and errors', async () => {
      const username = 'a'.repeat(13)
      const res = await request(app)
        .post('/api/users/')
        .send({
          username,
          password: 'password',
          email: 'testuseremail@email.com'
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors[0]).toHaveProperty('username')
      expect(await users.findOne({ username })).toBeNull()
    })

    it('if password is < 7 chars returns status 400 and errors', async () => {
      const username = 'testuser'
      const password = 'a'.repeat(6)
      const res = await request(app)
        .post('/api/users/')
        .send({
          username,
          password,
          email: 'testuseremail@email.com'
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors[0]).toHaveProperty('password')
      expect(await users.findOne({ username })).toBeNull()
    })

    it('if password is > 20 chars returns status 400 and errors', async () => {
      const username = 'testuser'
      const password = 'a'.repeat(21)
      const res = await request(app)
        .post('/api/users/')
        .send({
          username,
          password,
          email: 'testuseremail@email.com'
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors[0]).toHaveProperty('password')
      expect(await users.findOne({ username })).toBeNull()
    })

    it('if email is invalid returns status 400 and errors', async () => {
      const username = 'testuser'

      const res = await request(app)
        .post('/api/users/')
        .send({
          username,
          password: 'password',
          email: 'testuseremail' // no @email.com
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors[0]).toHaveProperty('email')
      expect(await users.findOne({ username })).toBeNull()
    })
  })

  describe('POST /auth', () => {
    const username = teacher.username
    const password = 'password'

    it('with correct info returns status 200 and a jwt token', async () => {
      const res = await request(app)
        .post('/api/users/auth')
        .send({
          username,
          password
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.body).toHaveProperty('token')
      const decodedToken = jwt.decode(res.body.token)
      const user = await users.findOne({ username })
      expect(decodedToken.user.id).toEqual(`${user._id}`)
    })

    it('if username does not exist returns status 400 and errors', async () => {
      const res = await request(app)
        .post('/api/users/auth')
        .send({
          username: username + 'abcdef',
          password
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors[0]).toHaveProperty('username')
    })

    it('if password is invalid returns status 400 and errors', async () => {
      const res = await request(app)
        .post('/api/users/auth')
        .send({
          username,
          password: password + 'abcdef'
        })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(res.body).toHaveProperty('errors')
      expect(res.body.errors[0]).toHaveProperty('password')
    })
  })

  describe('GET /me', () => {
    const username = teacher.username
    const password = 'password'
    let token = ''
    let user: User

    beforeAll(async () => {
      let res = await request(app)
        .post('/api/users/auth')
        .send({ username, password })
      ;({ token } = res.body)
      user = await users.findOne({ username })
    })

    describe('/', () => {
      it('if no auth token in request returns status 401', async () => {
        await request(app).get('/api/users/me').expect(401)
      })

      it('returns status 200 and user data if token is present', async () => {
        const res = await request(app)
          .get('/api/users/me')
          .set('x-auth-token', token)
          .expect(200)
        expect(res.body.username).toEqual(username)
      })
    })

    describe('/quizzes', () => {
      const get = (token?: string, format?: string) => {
        const url =
          '/api/users/me/quizzes' + (format != null ? `?format=${format}` : '')
        return request(app)
          .get(url)
          .set('x-auth-token', token ?? '')
      }

      it('if no auth token in request returns status 401', async () => {
        await get().expect(401)
      })

      it('if format query is invalid returns status 400', async () => {
        const res = await get(token, 'invalid').expect(400)
        expect(res.body).toHaveProperty('errors')
        expect(res.body.errors[0]).toHaveProperty('format')
      })

      it('by default or if format=full returns status 200 and full quizzes', async () => {
        const expectQuizIsFull = quiz => {
          expect(quiz).toHaveProperty('allowedUsers')
          expect(quiz).toHaveProperty('results')
          expect(quiz).toHaveProperty('questions')
        }

        let res = await get(token).expect(200)
        expect(res.body).toHaveLength(user.quizzes.length)
        res.body.forEach(expectQuizIsFull)

        res = await get(token, 'full').expect(200)
        expect(res.body).toHaveLength(user.quizzes.length)
        res.body.forEach(expectQuizIsFull)
      })

      it('if format=listing returns status 200 and listings', async () => {
        const expectQuizIsListing = quiz => {
          expect(quiz).toHaveProperty('resultsCount')
          expect(quiz).toHaveProperty('questionCount')
          expect(quiz).not.toHaveProperty('allowedUsers')
          expect(quiz).not.toHaveProperty('results')
          expect(quiz).not.toHaveProperty('questions')
        }

        const res = await get(token, 'listing').expect(200)
        expect(res.body).toHaveLength(user.quizzes.length)
        res.body.forEach(expectQuizIsListing)
      })
    })

    describe('/results', () => {
      const username = student.username
      const password = 'password'
      let token = ''

      beforeAll(async () => {
        let res = await request(app)
          .post('/api/users/auth')
          .send({ username, password })
        ;({ token } = res.body)
      })

      const get = (token?: string, format?: string) => {
        const url =
          '/api/users/me/results' + (format != null ? `?format=${format}` : '')
        return request(app)
          .get(url)
          .set('x-auth-token', token ?? '')
      }

      it('if no auth token in request returns status 401', async () => {
        await get().expect(401)
      })

      it('if format query is invalid returns status 400', async () => {
        const res = await get(token, 'invalid').expect(400)
        expect(res.body).toHaveProperty('errors')
        expect(res.body.errors[0]).toHaveProperty('format')
      })

      it('by default or if format=full returns status 200 and full results', async () => {
        const expectFullResult = result => {
          expect(result).toHaveProperty('answers')
        }

        let res = await get(token).expect(200)
        expect(res.body).toHaveLength(user.results.length)
        res.body.forEach(expectFullResult)

        res = await get(token, 'full').expect(200)
        expect(res.body).toHaveLength(user.results.length)
        res.body.forEach(expectFullResult)
      })

      it('if format=listing returns status 200 and listings', async () => {
        const expectResultListing = result => {
          expect(result).not.toHaveProperty('answers')
        }

        const res = await get(token, 'listing').expect(200)
        expect(res.body).toHaveLength(user.results.length)
        res.body.forEach(expectResultListing)
      })
    })
  })

  describe('PUT /me', () => {
    const username = student.username
    const password = 'password'
    let token = ''

    beforeAll(async () => {
      let res = await request(app)
        .post('/api/users/auth')
        .send({ username, password })
      ;({ token } = res.body)
    })

    describe('/password', () => {
      const get = (token?: string) => {
        const url = '/api/users/me/password'
        return request(app)
          .put(url)
          .set('x-auth-token', token ?? '')
      }

      it('if no auth token in request returns status 401', async () => {
        await get().expect(401)
      })

      it('if password is < 7 chars returns status 400 and errors', async () => {
        const password = 'a'.repeat(6)
        const res = await get(token).send({ password }).expect(400)

        expect(res.body).toHaveProperty('errors')
        expect(res.body.errors[0]).toHaveProperty('password')
      })

      it('if password is > 20 chars returns status 400 and errors', async () => {
        const password = 'a'.repeat(21)
        const res = await get(token).send({ password }).expect(400)

        expect(res.body).toHaveProperty('errors')
        expect(res.body.errors[0]).toHaveProperty('password')
      })

      it('if password is valid returns status 204', async () => {
        await get(token).send({ password: 'password' }).expect(204)
      })
    })

    describe('/email', () => {
      const get = (token?: string) => {
        const url = '/api/users/me/email'
        return request(app)
          .put(url)
          .set('x-auth-token', token ?? '')
      }

      it('if no auth token in request returns status 401', async () => {
        await get().expect(401)
      })

      it('if email is invalid returns status 400 and errors', async () => {
        const res = await get(token).send({ email: 'testemail' }).expect(400)
        expect(res.body).toHaveProperty('errors')
        expect(res.body.errors[0]).toHaveProperty('email')
      })

      it('if email is already taken returns status 409 and errors', async () => {
        const res = await get(token).send({ email: teacher.email }).expect(409)
        expect(res.body).toHaveProperty('errors')
        expect(res.body.errors[0]).toHaveProperty('email')
      })

      it('if email is valid and not taken returns status 204', async () => {
        await get(token).send({ email: 'testemail@email.com' }).expect(204)
      })
    })
  })

  describe('DELETE /me', () => {
    const username = student.username
    const password = 'password'
    let user: User
    let token = ''

    beforeAll(async () => {
      let res = await request(app)
        .post('/api/users/auth')
        .send({ username, password })
      ;({ token } = res.body)
      user = await users.findOne({ username })
    })

    it('removes the student user, their quizzes, and their results', async () => {
      await request(app)
        .delete('/api/users/me')
        .set('x-auth-token', token)
        .expect(204)
      expect(await users.findOne({ username })).toBeNull()
      await Promise.all(
        user.quizzes.map(async quiz => {
          expect(
            await db.collection('quizzes').findOne({ _id: new ObjectId(quiz) })
          ).toBeNull()
        })
      )
      await Promise.all(
        user.results.map(async result => {
          expect(
            await db
              .collection('results')
              .findOne({ _id: new ObjectId(result) })
          ).toBeNull()
        })
      )
    })
  })
})
