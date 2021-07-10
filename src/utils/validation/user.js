'use strict'

const { check, oneOf } = require('express-validator')
const { handleValidationError } = require('./common')

const usernameValidation = check('username')
  .not()
  .isEmpty()
  .withMessage('Username is required.')
  .isLength({ max: 7 })
  .withMessage('Username can be of maximum 7 characters long.')
  .trim()
  .matches(/^[0-9a-zA-Z_]+$/i)
  .withMessage(
    'Username can contain only alphabets and numbers and must be at least 4 characters long.'
  )

const fullNameValidation = check('name')
  .not()
  .isEmpty()
  .withMessage('Full Name is required.')
  .isLength({ min: 8 })
  .withMessage('Full Name should be at least 8 characters long.')
  .trim()
  

const passwordValidation = check('password')
  .not()
  .isEmpty()
  .withMessage('Password is required.')
  .isLength({ min: 8 })
  .withMessage('Password should be at least 8 characters long.')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/)
  .withMessage(
    'Password must contain one lowercase, one uppercase, one numeric and one special character.'
  )
  .trim()

const emailValidation = check('email')
  .not()
  .isEmpty()
  .withMessage('Email address is required.')
  .trim()
  .isEmail()
  .withMessage('Invalid email address.')

const booleanValidation = check('is_cookie')
  .isBoolean()
  .withMessage('Boolean value is required.')

const loginValidation = [
  oneOf([[usernameValidation], [emailValidation]]),
  handleValidationError
]

const registerValidation = [
  fullNameValidation,
  passwordValidation,
  handleValidationError
]

const updateProfileValidation = [
  fullNameValidation,
  usernameValidation,
  // booleanValidation,
  handleValidationError,
]

const changePasswordValidation = [
  passwordValidation,
  passwordValidation
]

module.exports = {
  loginValidation,
  registerValidation,
  emailValidation,
  updateProfileValidation,
  changePasswordValidation
}
