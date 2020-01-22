const { body } = require('express-validator')

const MIN_USERNAME_LEN = 5
const MAX_USERNAME_LEN = 12

const isValidUsername = username =>
  typeof username === 'string' &&
  username.length >= 5 &&
  /^[a-z0-9]+$/i.test(username)

const checkUsername = body(
  'username',
  `Username field must an alphanumeric string between ${MIN_USERNAME_LEN} and ${MAX_USERNAME_LEN} characters.`
).custom(isValidUsername)

const MIN_PASSWORD_LEN = 8
const MAX_PASSWORD_LEN = 20

const isValidPassword = password =>
  typeof password === 'string' &&
  password.length >= MIN_PASSWORD_LEN &&
  password.length <= MAX_PASSWORD_LEN

const checkPassword = body(
  'password',
  `Password field must be between ${MIN_PASSWORD_LEN} and ${MAX_PASSWORD_LEN} characters long.`
).optional(isValidPassword)

const checkEmail = body(
  'email',
  'Email field must be in the form of a valid email'
).isEmail()

module.exports = {
  isValidUsername,
  checkUsername,
  isValidPassword,
  checkPassword,
  checkEmail
}
