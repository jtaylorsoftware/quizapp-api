class ServiceLocator {
  constructor(userService, quizService, resultService) {
    this._userService = userService
    this._quizService = quizService
    this._resultService = resultService
  }

  get user() {
    return this._userService
  }

  get quiz() {
    return this._quizService
  }

  get result() {
    return this._resultService
  }
}

exports.ServiceLocator = ServiceLocator
