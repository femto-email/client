const nodemailer = require('nodemailer')
const { ipcRenderer } = require('electron')

let transporters = {}

ipcRenderer.on('send', async (event, arg) => {
  let details = (await accounts.findAsync({ _id: arg.from }))[0]
  console.log(details)
  console.log(arg)
})

async function send (email) {
  // create reusable transporter object using the default SMTP transport
  if (typeof transporters[email] === 'undefined') {
    transporters[email] = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'popeygilbert@gmail.com',
        pass: '2f4i95FgZTmh'
      }
    })
  }

  // setup email data with unicode symbols
  let mailOptions = {
    from: 'Alexander <popeygilbert@gmail.com>', // sender address
    to: 'popeygilbert@gmail.com', // list of receivers
    subject: 'Hello ✔', // Subject line
    text: 'Hello world ?', // plain text body
    html: '<b>Hello world ?</b>' // html body
  }

  // send mail with defined transport object
  transporters[email].sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error)
    }
    console.log(`Message ${info.messageId} sent: ${info.response}`)
  })
}

// send()

module.exports = { send }
