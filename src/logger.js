'use strict'

const Logger = require('logplease')
Logger.setLogLevel('INFO')
module.exports = Logger.create('ubblu-backend', {
  color: Logger.Colors.Yellow,
  showTimestamp: false
})
