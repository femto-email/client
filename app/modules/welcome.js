const $ = require('jquery')

function welcome() {
  if (!testLoaded('welcome')) return

  logger.debug(`We're loading up the welcome page now.`)
  page('welcome', ['basic', 'welcome'])

  if (process.env.NODE_ENV != 'production') { fillFields() }

  $('#login-form').on('submit', async (e) => {
    e.preventDefault()
    let details = getItemsFromForm('login-form')

    let client = await mailer.login(details)
    logger.log(`Successfully logged in to user ${details.user}.`)

    try {
      let doc = await accounts.insertAsync(details)
      logger.log(`Added ${details.user} to the accounts database.`)
    } catch(e) {
      logger.warning(`Huh, ${details.user} appeared to already be in the database?`)
    }
    
    let mailboxes = await mailer.getMailboxes(client)
    logger.log(`Retrieved all mailboxes from ${details.user}`)
    let emails = await mailer.getNewEmails(client, true)

    console.log(mailboxes)
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