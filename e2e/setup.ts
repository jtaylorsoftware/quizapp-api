import Quiz from 'models/quiz'
import Result from 'models/result'
import User from 'models/user'
import moment from 'moment'
import mongo from 'mongodb'
import bcrypt from 'bcryptjs'

require('dotenv').config()

/**
 * Setup file that inserts some users, quizzes, and results into the
 * quizapp database while handling all the wiring (adding doc IDs to arrays
 * of quizzes & results).
 */

export const teacher = {
  username: 'teacher',
  email: 'teacher@email.com',
  password: 'password'
}

export const student = {
  username: 'student',
  email: 'student@email.com',
  password: 'password'
}

export const extraUser = {
  username: 'extrauser',
  email: 'extrauser@email.com',
  password: 'password'
}

export const users = [
  {
    ...teacher,
    date: moment().toISOString(),
    quizzes: [],
    results: []
  },
  {
    ...student,
    date: moment().toISOString(),
    quizzes: [],
    results: []
  },
  {
    ...extraUser,
    date: moment().toISOString(),
    quizzes: [],
    results: []
  }
]

const teacherQuizzes = [
  // public quiz
  {
    user: '',
    title: 'public quiz',
    expiration: moment().add(1, 'd').toISOString(),
    isPublic: true,
    questions: [
      {
        text: 'q1',
        correctAnswer: 0,
        answers: [
          {
            text: 'answer 1'
          },
          {
            text: 'answer 2'
          }
        ]
      }
    ],
    results: [],
    allowedUsers: []
  },
  // private quiz
  {
    user: '',
    title: 'private quiz',
    expiration: moment().add(1, 'd').toISOString(),
    isPublic: false,
    questions: [
      {
        text: 'q1',
        correctAnswer: 0,
        answers: [
          {
            text: 'answer 1'
          },
          {
            text: 'answer 2'
          }
        ]
      }
    ],
    results: [],
    allowedUsers: [] // will contain extraUser
  }
]

const studentQuizzes = [
  {
    user: '',
    title: 'student quiz',
    expiration: moment().add(1, 'd').toISOString(),
    isPublic: true,
    questions: [
      {
        text: 'q1',
        correctAnswer: 0,
        answers: [
          {
            text: 'answer 1'
          },
          {
            text: 'answer 2'
          }
        ]
      }
    ],
    results: [],
    allowedUsers: []
  }
]

export const quizzes = [...teacherQuizzes, ...studentQuizzes]

export const results = [
  {
    user: '',
    quiz: '',
    quizOwner: '',
    answers: [
      {
        choice: 0
      }
    ],
    score: 0
  },
  {
    user: '',
    quiz: '',
    quizOwner: '',
    answers: [
      {
        choice: 0
      }
    ],
    score: 1.0
  },
  {
    user: '',
    quiz: '',
    quizOwner: '',
    answers: [
      {
        choice: 0
      }
    ],
    score: 1.0
  }
]

let usersCol: mongo.Collection
let quizzesCol: mongo.Collection
let resultsCol: mongo.Collection

const addUsers = async () => {
  const salt = await bcrypt.genSalt(10)
  const IDs: string[] = await Promise.all(
    users.map(async user => {
      user.password = await bcrypt.hash(user.password, salt)
      const { insertedId } = await usersCol.insertOne(user)
      return insertedId.toString()
    })
  )

  {
    const id = users.find(user => user.username === teacher.username)['_id']
    const extraUserID = users.find(
      user => user.username === extraUser.username
    )['_id']
    teacherQuizzes.forEach(quiz => {
      quiz.user = id
      if (!quiz.isPublic) {
        quiz.allowedUsers.push(extraUserID)
      }
    })
  }

  {
    const id = users
      .find(user => user.username === student.username)
      ['_id'].toString()
    studentQuizzes.forEach(quiz => {
      quiz.user = id
    })
  }

  results.forEach((result, ind) => {
    const id = IDs[ind]
    result.user = id
    result.quizOwner = id
  })
}

const addQuizzes = async () => {
  {
    // add teacher quizzes
    const promises = teacherQuizzes.map(async quiz => {
      const { insertedId } = await quizzesCol.insertOne(quiz)
      return insertedId.toString()
    })
    const ids = await Promise.all(promises)

    await usersCol.updateOne(
      { username: teacher.username },
      {
        $addToSet: {
          quizzes: {
            $each: ids
          }
        }
      }
    )
  }

  {
    // add student's quizzes
    const promises = studentQuizzes.map(async quiz => {
      const { insertedId } = await quizzesCol.insertOne(quiz)
      return insertedId.toString()
    })
    const ids = await Promise.all(promises)

    await usersCol.updateOne(
      { username: student.username },
      {
        $addToSet: {
          quizzes: {
            $each: ids
          }
        }
      }
    )
  }

  results.forEach((result, ind) => {
    result.quiz = quizzes[ind]['_id'].toString()
  })
}

const addResults = async () => {
  const promises = results.map(async result => {
    const { insertedId } = await resultsCol.insertOne(result)
    return insertedId.toString()
  })
  const ids = await Promise.all(promises)

  await Promise.all(
    users.map(async (user, ind) => {
      await usersCol.updateOne(
        {
          username: user.username
        },
        {
          $addToSet: {
            results: ids[ind]
          }
        }
      )
    })
  )

  await Promise.all(
    quizzes.map(async (quiz, ind) => {
      await quizzesCol.updateOne(
        { title: quiz.title },
        {
          $addToSet: {
            results: results[ind]['_id']
          }
        }
      )
    })
  )
}

export default async () => {
  const client = await mongo.connect(process.env.DB_URL, {
    useUnifiedTopology: true,
    useNewUrlParser: true
  })
  const db = await client.db()
  usersCol = db.collection<User>('users')
  quizzesCol = db.collection<Quiz>('quizzes')
  resultsCol = db.collection<Result>('results')

  await addUsers()
  await addQuizzes()
  await addResults()

  //@ts-ignore
  global.__MONGO__ = client
}
