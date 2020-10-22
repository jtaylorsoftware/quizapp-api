import { body } from 'express-validator'

const MIN_USERNAME_LEN = 5
const MAX_USERNAME_LEN = 12

export function isValidUsername(username: string) {
  return (
    typeof username === 'string' &&
    username.length >= 5 &&
    username.length <= MAX_USERNAME_LEN &&
    /^[a-z0-9]+$/i.test(username)
  )
}

export const checkUsername = body(
  'username',
  `Username field must an alphanumeric string between ${MIN_USERNAME_LEN} and ${MAX_USERNAME_LEN} characters.`
).custom(isValidUsername)

export const MIN_PASSWORD_LEN = 8
export const MAX_PASSWORD_LEN = 20

export function isValidPassword(password: string) {
  return (
    typeof password === 'string' &&
    password.length >= MIN_PASSWORD_LEN &&
    password.length <= MAX_PASSWORD_LEN
  )
}
export const checkPassword = body(
  'password',
  `Password field must be between ${MIN_PASSWORD_LEN} and ${MAX_PASSWORD_LEN} characters long.`
).custom(isValidPassword)

export const checkEmail = body(
  'email',
  'Email field must be in the form of a valid email'
).isEmail()
