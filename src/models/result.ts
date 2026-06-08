import { ObjectId } from 'mongodb'
import Model from './model'
import { GradedAnswer } from './answertypes'

/**
 * Represents a quiz result document
 */
export default class Result extends Model {
  /**
   * Creates a quiz result document
   * @param user ID of user submitting result
   * @param quiz ID of quiz the result is for
   * @param quizOwner ID of owner of the quiz
   * @param answers The user's answers to the quiz, along with grading information for each answer
   * @param score The computed score (percent correct)
   */
  constructor(
    public user: ObjectId,
    public quiz: ObjectId,
    public quizOwner: ObjectId,
    public answers?: GradedAnswer[],
    public score?: number
  ) {
    super()
    this.user = ObjectId.isValid(user) ? user : new ObjectId()
    this.quiz = ObjectId.isValid(quiz) ? quiz : new ObjectId()
    this.quizOwner = ObjectId.isValid(quizOwner) ? quizOwner : new ObjectId()
    this.answers = answers
    this.score = score
  }
}

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
 * A Result that includes extra details.
 */
export type ResultWithExtras = Result & ResultExtras

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
