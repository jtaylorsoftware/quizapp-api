const canViewQuiz = (id, quiz) =>
  quiz.isPublic ||
  quiz.user.toString() === id ||
  !quiz.allowedUsers.some(userId => userId.toString() === id)

exports.getRequestedQuiz = async (req, res, next) => {
  try {
    const quiz = await quizRepository.findById(req.params.id)
    if (!quiz) {
      return res
        .status(404)
        .json({ errors: [{ msg: 'There is no matching quiz found' }] })
    }
    req.quiz = quiz
    return next()
  } catch (error) {
    console.error(error)
    res.status(500).json({ errors: [{ msg: 'Internal server error' }] })
  }
}

exports.authorizeQuizAccess = (req, res, next) => {
  const { user, quiz } = req
  if (user) {
    if (!canViewQuiz(user.id, quiz)) {
      return res.status(403).json({
        errors: [{ msg: 'You are not allowed to view this quiz' }]
      })
    }
  } else if (!quiz.isPublic) {
    return res.status(401).json({
      errors: [{ msg: 'You must be logged in to view this quiz' }]
    })
  }
  return next()
}

exports.requireQuizOwner = async (req, res, next) => {
  if (req.quiz.user.toString() !== req.user.id) {
    return res
      .status(403)
      .json({ errors: [{ msg: 'You are not the owner of this quiz' }] })
  }
  return next()
}
