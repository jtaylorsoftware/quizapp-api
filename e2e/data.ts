import Quiz from 'models/quiz'
import Result from 'models/result'
import User from 'models/user'
import moment from 'moment'
import { OptionalId, ObjectId, Collection, Db } from 'mongodb'
import bcrypt from 'bcryptjs'
import { UserRegistrationData } from 'services/v2/user'

export const teacherA: UserRegistrationData = {
  username: 'teacherA',
  email: 'teacherA@email.com',
  password: 'password',
  role: 'teacher',
}

export const teacherB: UserRegistrationData = {
  username: 'teacherB',
  email: 'teacherB@email.com',
  password: 'password',
  role: 'teacher',
}

export const studentA: UserRegistrationData = {
  username: 'studentA',
  email: 'studentA@email.com',
  password: 'password',
  role: 'student',
}

export const studentB: UserRegistrationData = {
  username: 'studentB',
  email: 'studentB@email.com',
  password: 'password',
  role: 'student',
}

export const users: {
  teacherA: OptionalId<User>
  teacherB: OptionalId<User>
  studentA: OptionalId<User>
  studentB: OptionalId<User>
} = {
  teacherA: {
    ...teacherA,
    _id: new ObjectId(),
    date: moment().toISOString(),
    quizzes: [new ObjectId(), new ObjectId()],
    results: [] as ObjectId[],
  },
  teacherB: {
    ...teacherB,
    _id: new ObjectId(),
    date: moment().toISOString(),
    quizzes: [new ObjectId()],
    results: [] as ObjectId[],
  },
  studentA: {
    ...studentA,
    _id: new ObjectId(),
    date: moment().toISOString(),
    quizzes: [] as ObjectId[],
    results: [new ObjectId()],
  },
  studentB: {
    ...studentB,
    _id: new ObjectId(),
    date: moment().toISOString(),
    quizzes: [] as ObjectId[],
    results: [new ObjectId()],
  },
}

export const teacherAQuizzes: OptionalId<Quiz>[] = [
  // public quiz
  {
    _id: users.teacherA.quizzes[0],
    user: users.teacherA._id!,
    title: 'public quiz',
    expiration: moment().add(1, 'd').toISOString(),
    isPublic: true,
    questions: [
      {
        type: 'MultipleChoice',
        text: 'q1',
        correctAnswer: 0,
        answers: [
          {
            text: 'answer 1',
          },
          {
            text: 'answer 2',
          },
        ],
      },
    ],
    results: [users.studentA.results[0]!],
    allowedUsers: [],
    date: moment().toISOString(),
    showCorrectAnswers: true,
    allowMultipleResponses: false,
    publishResults: true,
  },
  // private quiz
  {
    _id: users.teacherA.quizzes[1],
    user: users.teacherA._id!,
    title: 'private quiz',
    expiration: moment().add(1, 'd').toISOString(),
    isPublic: false,
    questions: [
      {
        type: 'MultipleChoice',
        text: 'q1',
        correctAnswer: 0,
        answers: [
          {
            text: 'answer 1',
          },
          {
            text: 'answer 2',
          },
        ],
      },
    ],
    results: [users.studentB.results[0]!],
    allowedUsers: [users.studentB._id!],
    date: moment().toISOString(),
    showCorrectAnswers: true,
    allowMultipleResponses: false,
    publishResults: false,
  },
]

export const teacherBQuizzes: OptionalId<Quiz>[] = [
  // public quiz
  {
    _id: users.teacherB.quizzes[0],
    user: users.teacherB._id!,
    title: 'public quiz',
    expiration: moment().add(1, 'd').toISOString(),
    isPublic: true,
    questions: [
      {
        type: 'MultipleChoice',
        text: 'q1',
        correctAnswer: 0,
        answers: [
          {
            text: 'answer 1',
          },
          {
            text: 'answer 2',
          },
        ],
      },
    ],
    results: [],
    allowedUsers: [],
    date: moment().toISOString(),
    showCorrectAnswers: true,
    allowMultipleResponses: false,
    publishResults: true,
  }
]

export const results: OptionalId<Result>[] = [
  {
    _id: users.studentA.results[0]!,
    user: users.studentA._id!,
    quiz: teacherAQuizzes[0]._id!,
    quizOwner: users.teacherA._id!,
    answers: [
      {
        type: 'MultipleChoice',
        choice: 0,
      },
    ],
    date: moment().toISOString(),
    score: 0,
  },
  {
    _id: users.studentB.results[0]!,
    user: users.studentB._id!,
    quiz: teacherAQuizzes[1]._id!,
    quizOwner: users.teacherA._id!,
    answers: [
      {
        type: 'MultipleChoice',
        choice: 0,
      },
    ],
    date: moment().toISOString(),
    score: 1,
  }
]

/**
 * Initializes the database with user data for end-to-end tests.
 */
const addUsers = async (usersCol: Collection<User>) => {
  const salt = await bcrypt.genSalt(10)
  const usersList = Object.values(users)
  await Promise.all(
    usersList.map(async (user) => {
      user.password = await bcrypt.hash(user.password, salt)
      const { insertedId } = await usersCol.insertOne(user)
      return insertedId
    })
  )
}

/**
 * Initializes the database with quiz data for end-to-end tests.
 */
const addQuizzes = async (
  quizzesCol: Collection<Quiz>,
) => {
    // add teacher quizzes
    const promises = [...teacherAQuizzes, ...teacherBQuizzes].map(async (quiz) => {
      const { insertedId } = await quizzesCol.insertOne(quiz)
      return insertedId
    })
    await Promise.all(promises)
}

/**
 * Initializes the database with result data for end-to-end tests.
 */
const addResults = async (
  resultsCol: Collection<Result>,
) => {
  const promises = results.map(async (result) => {
    const { insertedId } = await resultsCol.insertOne(result)
    return insertedId
  })
  await Promise.all(promises)
}

export async function loadTestData(db: Db) {
  const quizzes = db.collection<Quiz>('quizzes')
  const users = db.collection<User>('users')
  const results = db.collection<Result>('results')
  await addUsers(users)
  await addQuizzes(quizzes)
  await addResults(results)
}

export async function clearTestData(db: Db) {
  await db.collection('users').deleteMany({})
  await db.collection('quizzes').deleteMany({})
  await db.collection('results').deleteMany({})
}
