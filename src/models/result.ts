import { ObjectId } from 'mongodb'
import Model from './model'
import { GradedAnswer } from './answertypes'

/**
 * A Result that includes extra details.
 */
export type ResultWithExtras = Result & ResultExtras

/**
 * Extra computed data for a Result.
 */
export type ResultExtras = {
  // Name of the user for this result
  username?: string

  // Title of the associated quiz
  quizTitle?: string

  // Associated quiz owner's username
  ownerUsername?: string
}

/**
 * A brief format for a quiz Result. It omits large data types such as lists or nested
 * objects.
 */
export type ResultListing = Omit<Result, 'answers'> & ResultExtras

export type ResultFormat = 'full' | 'listing'

export type ResultType<FormatType> = FormatType extends 'full'
  ? ResultWithExtras
  : FormatType extends 'listing'
  ? ResultListing
  : never

/**
 * Represents a quiz result document
 * @property user id of user submitting result
 * @property quiz id of quiz the result is for
 * @property quizOwner id of owner of the quiz
 * @property answers
 * @property score the computed score (percent correct)
 */
export default class Result extends Model {
  constructor(
    public user: ObjectId,
    public quiz: ObjectId,
    public quizOwner: ObjectId,
    public answers: Array<GradedAnswer>,
    public score: number
  ) {
    super()
    this.user = ObjectId.isValid(user) ? user : new ObjectId()
    this.quiz = ObjectId.isValid(quiz) ? quiz : new ObjectId()
    this.quizOwner = ObjectId.isValid(quizOwner) ? quizOwner : new ObjectId()
    this.answers = answers
    this.score = score
  }
}
