import UserService from './user'
import QuizService from './quiz'
import ResultService from './result'

export default class ServiceLocator {
  constructor(
    private userService: UserService,
    private quizService: QuizService,
    private resultService: ResultService
  ) {
    this.userService = userService
    this.quizService = quizService
    this.resultService = resultService
  }

  get user(): UserService {
    return this.userService
  }

  get quiz(): QuizService {
    return this.quizService
  }

  get result(): ResultService {
    return this.resultService
  }
}
