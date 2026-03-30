import { ObjectId } from 'mongodb'
import Model from './model'
import { Question } from './questiontypes'

/**
 * Representation of a Quiz document
 */
export default class Quiz extends Model {
  results: ObjectId[]

  /**
   * Creates a new Quiz instance.
   * @param user ID of owner
   * @param title Title of quiz
   * @param expiration Expiration date of quiz (as ISO string)
   * @param isPublic Can anyone with link view quiz
   * @param questions Array of questions
   * @param showCorrectAnswers Should results contain the correct answers
   * @param allowMultipleResponses Should multiple responses be used
   * @param publishResults Should results be accessible to users
   */
  constructor(
    public user: ObjectId,
    public title: string,
    public expiration: string,
    public isPublic: boolean = true,
    public questions: Question[] = [],
    public allowedUsers: ObjectId[] = [],
    public showCorrectAnswers: boolean = true, // TODO - in validation and client allow user to toggle
    public allowMultipleResponses: boolean = false, // TODO - in validation and client allow user to toggle
    public publishResults: boolean = false
  ) {
    super()
    this.user = ObjectId.isValid(user) ? user : new ObjectId()
    this.results = []
  }
}

export type QuizFormat = 'full' | 'listing'
export type QuizType<FormatType> = FormatType extends 'full'
  ? QuizWithAllowedUsernames
  : FormatType extends 'listing'
  ? QuizListing
  : never

/**
 * The data necessary to upload a new Quiz or edit an existing Quiz.
 */
export type QuizUploadData = Omit<
  Quiz,
  | 'allowMultipleResponses'
  | 'showCorrectAnswers'
  | 'publishResults'
  | 'user'
  | 'allowedUsers'
  | 'results'
  | 'date'
> & {
  allowedUsers?: string[]
  showCorrectAnswers?: boolean
  allowMultipleResponses?: boolean
  publishResults?: boolean
}

/**
 * QuizForm is a sanitized Quiz type that can safely be
 * given to users that do not own the Quiz.
 */
export type QuizForm = Omit<
  Quiz,
  | 'questions'
  | 'allowedUsers'
  | 'allowMultipleResponses'
  | 'showCorrectAnswers'
  | 'publishResults'
  | 'isPublic'
  | 'results'
  | 'user'
> & {
  // Original questions but with answers omitted
  questions?: Omit<Question, 'correctAnswer'>[]

  // Name of the user that created the quiz
  user?: string
}

/**
 * A brief format for a Quiz. It omits large data types such as lists or nested
 * objects.
 */
export type QuizListing = Omit<
  Quiz,
  'allowedUsers' | 'questions' | 'results'
> & {
  resultsCount: number
  questionCount: number
}

/**
 * A full format for a Quiz that replaces the `allowedUsers` Ids with their usernames.
 */
export type QuizWithAllowedUsernames = Omit<
  Quiz,
  'allowedUsers' | 'questions' | 'results'
> & {
  allowedUsers: string[]
  resultsCount: number
  questionCount: number
}