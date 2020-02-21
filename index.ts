if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const { startServer } = require('./server')

startServer(process.env.PORT)
  .then(() => console.log(`Server started`))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
