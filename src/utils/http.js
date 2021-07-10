'use strict'

const sendError = (res, { error, code, errorCode }) => {
  return res.status(code).send({
    success: false,
    code: errorCode,
    errors: [error]
  })
}

const sendResponse = (res, { data, code }) => {
  return res.status(code).send({
    success: true,
    data
  })
}

module.exports = {
  sendError,
  sendResponse
}
