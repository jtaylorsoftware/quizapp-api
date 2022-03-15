import { ObjectId } from 'mongodb'
import Model from './model'
import { Question } from './questiontypes'

/**
 * QuizForm is a sanitized Quiz type that can safely be
 * given to users that do not own the Quiz.
 */
export type QuizForm =
  Omit<Quiz, 'questions' | 'allowMultipleResponses' | 'allowedUsers' | 'showCorrectAnswers' | 'isPublic' | 'results' | 'user'>
  & {
  // Original questions but with answers omitted
  questions?: Omit<Question, 'correctAnswer'>[]

  // Name of the user that created the quiz
  user?: string
}

/**
 * Representation of a Quiz document
 * @property user id of owner
 * @property title of quiz
 * @property expiration expiration date of quiz (as ISO string)
 * @property isPublic can anyone with link view quiz
 * @property questions Array of questions
 * @property showCorrectAnswers should results contain the correct answers
 * @property allowMultipleResponses should multiple responses be used
 */
export default class Quiz extends Model {
  results: ObjectId[]

  constructor(
    public user: ObjectId,
    public title: string,
    public expiration: string,
    public isPublic: boolean = true,
    public questions: Question[] = [],
    public allowedUsers: ObjectId[] = [],
    public showCorrectAnswers: boolean = true, // TODO - in validation and client allow user to toggle
    public allowMultipleResponses: boolean = false, // TODO - in validation and client allow user to toggle
  ) {
    super()
    this.user = ObjectId.isValid(user) ? user : new ObjectId()
    this.results = []
  }
}
