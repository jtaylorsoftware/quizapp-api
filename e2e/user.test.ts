import request from 'supertest'

import jwt from 'jsonwebtoken'
import express from 'express'
import { MongoClient, Db, Collection } from 'mongodb'

import { configApp } from 'server'
import User from 'models/user'

describe('/api/users', () => {
  let app: express.Express
  let dbClient: MongoClient
  let db: Db
  let users: Collection<User>

  describe('POST /', () => {
    beforeAll(async () => {
      ;({ client: dbClient, app: app } = await configApp())
      db = await dbClient.db('quizapp')
      users = db.collection('users')
    })
    beforeEach(async () => {
      await users.drop()
    })

    afterAll(async () => {
      await dbClient.close()
    })

    it('with correct info returns status 200 and a jwt token', async () => {
      const res = await request(app)
        .post('/api/users/')
        .send({
          username: 'testuser',
          password: 'password',
          email: 'testuseremail@email.com'
        })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body).toHaveProperty('token')
      const decodedToken = jwt.decode(res.body.token)
      const user = await users.findOne({ username: 'testuser' })
      expect(decodedToken.user.id).toEqual(`${user._id}`)
    })
  })
})
