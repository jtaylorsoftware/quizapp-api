if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
import startServer from './server'

const PORT = Number.parseInt(process.env.PORT)

startServer(PORT)
  .then(() => console.log(`Server started`))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
