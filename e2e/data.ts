import Quiz from 'models/quiz'
import Result from 'models/result'
import User from 'models/user'
import moment from 'moment'
import { OptionalId, ObjectId, Collection, MongoAPIError, Db } from 'mongodb'
import bcrypt from 'bcryptjs'

export const teacher = {
  username: 'teacher',
  email: 'teacher@email.com',
  password: 'password',
}

export const student = {
  username: 'student',
  email: 'student@email.com',
  password: 'password',
}

export const extraUser = {
  username: 'extrauser',
  email: 'extrauser@email.com',
  password: 'password',
}

export const users: OptionalId<User>[] = [
  {
    ...teacher,
    date: moment().toISOString(),
    quizzes: [] as ObjectId[],
    results: [] as ObjectId[],
  },
  {
    ...student,
    date: moment().toISOString(),
    quizzes: [] as ObjectId[],
    results: [] as ObjectId[],
  },
  {
    ...extraUser,
    date: moment().toISOString(),
    quizzes: [] as ObjectId[],
    results: [] as ObjectId[],
  },
]

const teacherQuizzes: OptionalId<Quiz>[] = [
  // public quiz
  {
    user: new ObjectId(),
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
  },
  // private quiz
  {
    user: new ObjectId(),
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
    results: [],
    allowedUsers: [],
    date: moment().toISOString(),
    showCorrectAnswers: true,
    allowMultipleResponses: false,
  },
]

const studentQuizzes: OptionalId<Quiz>[] = [
  {
    user: new ObjectId(),
    title: 'student quiz',
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
  },
]

export const quizzes = [...teacherQuizzes, ...studentQuizzes]

export const results: OptionalId<Result>[] = [
  {
    user: new ObjectId(),
    quiz: new ObjectId(),
    quizOwner: new ObjectId(),
    answers: [
      {
        type: 'MultipleChoice',
        choice: 0,
      },
    ],
    score: 0,
    date: moment().toISOString(),
  },
  {
    user: new ObjectId(),
    quiz: new ObjectId(),
    quizOwner: new ObjectId(),
    answers: [
      {
        type: 'MultipleChoice',
        choice: 0,
      },
    ],
    score: 1.0,
    date: moment().toISOString(),
  },
  {
    user: new ObjectId(),
    quiz: new ObjectId(),
    quizOwner: new ObjectId(),
    answers: [
      {
        type: 'MultipleChoice',
        choice: 0,
      },
    ],
    score: 1.0,
    date: moment().toISOString(),
  },
]

const addUsers = async (usersCol: Collection<User>) => {
  const salt = await bcrypt.genSalt(10)
  const IDs: ObjectId[] = await Promise.all(
    users.map(async (user) => {
      user.password = await bcrypt.hash(user.password, salt)
      const { insertedId } = await usersCol.insertOne(user)
      return insertedId
    })
  )

  {
    const id = users.find((user) => user.username === teacher.username)!!._id!!
    const extraUserID = users.find(
      (user) => user.username === extraUser.username
    )!!._id!!
    teacherQuizzes.forEach((quiz) => {
      quiz.user = id
      if (!quiz.isPublic) {
        quiz.allowedUsers.push(extraUserID)
      }
    })
  }

  {
    const id = users.find((user) => user.username === student.username)!!._id!!
    studentQuizzes.forEach((quiz) => {
      quiz.user = id
    })
  }

  results.forEach((result, ind) => {
    const id = IDs[ind]
    //@ts-ignore
    result.user = id
    //@ts-ignore
    result.quizOwner = id
  })
}

const addQuizzes = async (
  quizzesCol: Collection<Quiz>,
  usersCol: Collection<User>
) => {
  {
    // add teacher quizzes
    const promises = teacherQuizzes.map(async (quiz) => {
      const { insertedId } = await quizzesCol.insertOne(quiz)
      return insertedId
    })
    const ids = await Promise.all(promises)

    await usersCol.updateOne(
      { username: teacher.username },
      {
        $addToSet: {
          quizzes: {
            $each: ids,
          },
        },
      }
    )
  }

  {
    // add student's quizzes
    const promises = studentQuizzes.map(async (quiz) => {
      const { insertedId } = await quizzesCol.insertOne(quiz)
      return insertedId
    })
    const ids = await Promise.all(promises)

    await usersCol.updateOne(
      { username: student.username },
      {
        $addToSet: {
          quizzes: {
            $each: ids,
          },
        },
      }
    )
  }

  results.forEach((result, ind) => {
    result.quiz = quizzes[ind]._id!!
  })
}

const addResults = async (
  resultsCol: Collection<Result>,
  usersCol: Collection<User>,
  quizzesCol: Collection<Quiz>
) => {
  const promises = results.map(async (result) => {
    const { insertedId } = await resultsCol.insertOne(result)
    return insertedId
  })
  const ids = await Promise.all(promises)

  await Promise.all(
    users.map(async (user, ind) => {
      await usersCol.updateOne(
        {
          username: user.username,
        },
        {
          $addToSet: {
            results: ids[ind],
          },
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
            results: results[ind]['_id'],
          },
        }
      )
    })
  )
}

export async function loadTestData(db: Db) {
  const quizzes = db.collection<Quiz>('quizzes')
  const users = db.collection<User>('users')
  const results = db.collection<Result>('results')
  await addUsers(users)
  await addQuizzes(quizzes, users)
  await addResults(results, users, quizzes)
}

export async function clearTestData(db: Db) {
  await db.collection('users').deleteMany({})
  await db.collection('quizzes').deleteMany({})
  await db.collection('results').deleteMany({})
}
