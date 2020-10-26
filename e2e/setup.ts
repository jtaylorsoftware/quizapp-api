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

export const teacherUsername = 'teacher'
export const studentUsername = 'student'
export const password = 'password'

export const teacherUser = {
  username: teacherUsername,
  date: moment().toISOString(),
  email: `${teacherUsername}@email.com`,
  password,
  quizzes: [],
  results: []
}

export const studentUser = {
  username: studentUsername,
  date: moment().toISOString(),
  email: `${studentUsername}@email.com`,
  password,
  quizzes: [],
  results: []
}

export const quizzes = [
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
  // private quiz, no allowed users
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
    allowedUsers: []
  }
]

export const studentQuiz = {
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

export const studentQuizResult = {
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
  teacherUser.password = await bcrypt.hash(password, salt)
  studentUser.password = await bcrypt.hash(password, salt)

  const { insertedId: teacherId } = await usersCol.insertOne(teacherUser)
  const { insertedId: studentId } = await usersCol.insertOne(studentUser)

  quizzes.forEach(quiz => {
    quiz.user = teacherId.toString()
  })
  quizzes[1].allowedUsers.push(studentId.toString())

  studentQuiz.user = studentId.toString()

  results.forEach(result => {
    result.user = studentId.toString()
    result.quizOwner = teacherId.toString()
  })

  studentQuizResult.user = teacherId
}

const addQuizzes = async () => {
  const promises = quizzes.map(async quiz => {
    const { insertedId } = await quizzesCol.insertOne(quiz)
    return insertedId.toString()
  })
  const ids = await Promise.all(promises)

  await usersCol.updateOne(
    { username: teacherUsername },
    {
      $addToSet: {
        quizzes: {
          $each: ids
        }
      }
    }
  )

  results.forEach((result, ind) => {
    result.quiz = quizzes[ind]['_id'].toString()
  })

  const { insertedId: studentQuizId } = await quizzesCol.insertOne(studentQuiz)
  await usersCol.updateOne(
    { username: studentUsername },
    {
      $addToSet: {
        quizzes: studentQuizId
      }
    }
  )
}

const addResults = async () => {
  const promises = results.map(async result => {
    const { insertedId } = await resultsCol.insertOne(result)
    return insertedId.toString()
  })
  const ids = await Promise.all(promises)

  await usersCol.updateOne(
    { username: studentUsername },
    {
      $addToSet: {
        results: {
          $each: ids
        }
      }
    }
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

  const { insertedId: teacherResultId } = await resultsCol.insertOne(
    studentQuizResult
  )
  await usersCol.updateOne(
    { username: teacherUsername },
    {
      $addToSet: {
        results: teacherResultId
      }
    }
  )

  await quizzesCol.updateOne(
    {
      title: studentQuiz.title
    },
    {
      $addToSet: {
        results: teacherResultId
      }
    }
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
