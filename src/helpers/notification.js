const admin = require('firebase-admin')
const get = require('lodash/get')
const serviceAccount = require('./adminsdk.json')

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://ubblu-notifications.firebaseio.com'
  })
} catch (error) {
  console.info('ERROR', error)
}

exports.messageNotification = (from = {}, tokens, groupname = false, data = {}) => {
  const fromUser = get(from, 'dataValues.username', 'ubblu user')
  let message = `${fromUser} has sent message to you`
  if (groupname) {
    message = `${fromUser} has sent a message to you on ${groupname}`
  } else {
    groupname = fromUser;
  }
  const defaultNotification = {
    title: 'Ubblu Chat',
    body: message
  };
  const notification = get(from, 'dataValues.notification', defaultNotification);
  admin.messaging().sendToDevice(tokens, {
    data: {
      fromUser,
      groupname,
      payload: data
    },
    notification,
  },{
    priority: 'normal',
    timeToLive: 60*60
  }).then(response => {
    console.info('FCM  NOTIFICATION then----------------------', response)
    response.results[0]
  }).catch(err => {
    console.info('FCM ERROR NOTIFICATION-----------------------', err)
  })

  // admin.messaging().sendMulticast({
  //   data: {
  //     message,
  //     notification
  //   },
  //   tokens
  // }).then(response => {
  //   console.info('REPSONSE DATA', response)
  // })
}