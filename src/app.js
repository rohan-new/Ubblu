'use strict'

const express = require('express')
const app = express()
const cors = require('cors')
const session = require('express-session')
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload')
const path = require('path');
var ioServer = require('./sockets')(app);

 
const db = require('./models')

const port = process.env.PORT || 8080;


// Initalize sequelize with session store
// const SequelizeStore = require('connect-session-sequelize')(session.Store)
// const sessionStore = new SequelizeStore({
//   db: db.sequelize
// })

// const sess = {
//   store: sessionStore,
//   name: process.env.COOKIE_NAME || 'ubblu-app',
//   secret: process.env.SESSION_SECRET || 'secret',
//   resave: false,
//   saveUninitialized: true,
//   cookie: {
//     maxAge: 1000 * 60 * 60 * 24 * 27,
//     httpOnly: false,
//     secure: false
//   }
// }

// sessionStore.sync()

// if (app.get('env') === 'production') {
//   app.set('trust proxy', 1)
//   sess.cookie.secure = true
// }

// app.use(fileUpload())
app.use(express.json())
app.use(cors({ origin: true, credentials: true, exposedHeaders: ['Content-Disposition'] }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
//app.use(session(sess))
app.use(express.static(path.join(__dirname, 'public')))

app.use(require('./controllers'))

// app.listen(8080, () => {
//   console.log('Ubblu listening on port 8080...')
// })

ioServer.listen(port, () => {  
  console.log(`Ubblu listening on port ${port}...`)
});


module.exports = app
