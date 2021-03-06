// @ts-nocheck

export default function(debug: (msg: any) => void) {
  return (req, res, next) => {
    debug(req.method + ' ' + req.url)
    return next()
  }
}
