'use strict'

const { validationResult } = require('express-validator')

const handleValidationError = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: [errors.array()[0].msg]
    })
  } else {
    next()
  }
}

module.exports = {
  handleValidationError
}
