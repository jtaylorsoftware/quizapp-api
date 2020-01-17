exports.debugRequests = debug => {
  return (req, res, next) => {
    debug(req.method + ' ' + req.url)
    return next()
  }
}
