import * as http from 'http'

const request = http.request({
  port: "8080",
  path: "/healthcheck",
  timeout: 5000
}, (res) => {
  console.log(`STATUS ${res.statusCode}`)
  if (res.statusCode === 200) {
    process.exit(0)
  } else {
    process.exit(1)
  }
})

request.on('error', () => {
  process.exit(1)
})

request.end()
