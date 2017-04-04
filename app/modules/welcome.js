const $ = require('jquery')

function welcome() {
  if (!testLoaded('welcome')) return

  logger.debug(`We're loading up the welcome page now.`)
  page('welcome', ['basic', 'welcome'])

  if (process.env.NODE_ENV != 'production') { fillFields() }

  $('#login-form').on('submit', async function onLogin(e) {
    e.preventDefault()
    let details = getItemsFromForm('login-form')

    $('#doing').text('logging you in.')
    let client = await mailer.login(details)
    logger.log(`Successfully logged in to user ${details.user}.`)

    $('#doing').text('creating a database for your mail.')
    let hash = await setupMailDB(details.user)
    logger.log(`Successfully created a database account for ${details.user}`)

    try {
      $('#doing').text('saving your account for the furture.')
      let doc = await accounts.insertAsync(details)
      logger.log(`Added ${details.user} to the accounts database.`)
    } catch(e) {
      logger.warning(`Huh, ${details.user} appeared to already be in the database?`)
    }
    
    $('#doing').text('grabbing your mailboxes.')
    let mailboxes = await mailer.getMailboxes(client)
    logger.log(`Retrieved all mailboxes from ${details.user}`)
    $('#doing').text('getting your emails.')
    let total = 0
    let highest = 0
    let promises = []
    let emails = await mailer.getNewEmails(client, true, '1', (seqno, msg, attributes) => {
      if (seqno > highest) {
        highest = seqno
      }
      promises.push(saveMail(details.user, hash, seqno, msg, attributes))
      total++
      $('#number').text(`(${total})`)
    })

    await accounts.updateAsync({ user: details.user }, { $set: { highest: highest }}, {})
    await Promise.all(promises)
    $('#number').text('')
    $('#doing').text('getting your inbox setup.')

    stateSet('state', 'mail')
    stateCheck()
  })
}

function fillFields() {
  $('#domain').val(process.env.DOMAIN)
  $('#port').val(process.env.PORT)
  $('#email').val(process.env.EMAIL)
  $('#password').val(process.env.PASSWORD)
  $('#secure').prop('checked', process.env.SECURE == 'true')
}

module.exports = { welcome }