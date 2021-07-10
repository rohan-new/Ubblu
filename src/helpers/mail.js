const nodemailer = require('nodemailer')
const EmailTemplate = require('email-templates').EmailTemplate

const fromEmail = process.env.SMTP_MAIL

const transporter = nodemailer.createTransport({
  // service: 'gmail',
  host: 'ubblu.com',
  port: 465,
  // secure: false, // upgrade later with STARTTLS
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD
  },
  // tls: { ciphers: 'SSLv3' },
  tls: { rejectUnauthorized: false },
  from: 'Ubblu <' + fromEmail + '>'
})

// Option can have to, subject, etc
async function sendMail(template_name, options, data) {  
  const template_sender = transporter.templateSender(
    new EmailTemplate('src/emails/' + template_name),
    {
      from: 'Ubblu <' + fromEmail + '>'
    }
  )

  return new Promise((resolve, reject) => {
    template_sender(options, data)
      .then(function(info) {
        return resolve({ status: 1, message: info })
      })
      .catch(function(err) {
        console.log('Err while sending mail: ', err)
        return reject({ status: 0, error: err })
      })
  })
}
 
module.exports = {
  sendMail
}
