import { ObjectId } from 'mongodb'
import { Model } from './model'

interface Answer {
  choice: string
}

/**
 * Represents a quiz result document
 * @property user id of user submitting result
 * @property quiz id of quiz the result is for
 * @property quizOwner id of owner of the quiz
 * @property answers
 * @property score the computed score (percent correct)
 */
export class Result extends Model {
  constructor(
    public user: ObjectId,
    public quiz: ObjectId,
    public quizOwner: ObjectId,
    public answers: Array<Answer>,
    public score: number
  ) {
    super()
    this.user = ObjectId.isValid(user) ? new ObjectId(user) : null
    this.quiz = ObjectId.isValid(quiz) ? new ObjectId(quiz) : null
    this.quizOwner = ObjectId.isValid(quizOwner)
      ? new ObjectId(quizOwner)
      : null
    this.answers = answers
    this.score = score
  }
}
