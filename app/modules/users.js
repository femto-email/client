const $ = require('jquery')

async function addAccount (details) {
  $('.wrapper').html(`
  <span id="doing"></span> <span id="number"></span><br>
  <span id="mailboxes"></span>
  `)
  
  $('#doing').text('logging you in.')
  let client = await mailer.login(details)
  logger.log(`Successfully logged in to user ${details.user}.`)

  $('#doing').text('creating a database for your mail.')
  let hash = await setupMailDB(details.user)
  logger.log(`Successfully created a database account for ${details.user}`)

  let user = {
    imap: { 
      host: details.host,
      port: details.port
    },
    smtp: {
      host: details.host_outgoing,
      port: details.port_outgoing
    },
    user: details.user, 
    password: details.password, 
    tls: details.tls,
    hash: hash,
    date: +new Date()
  }

  try {
    $('#doing').text('saving your account for the future.')
    let doc = await accounts.insertAsync(user)
    logger.log(`Added ${details.user} to the accounts database.`)
  } catch (e) {
    logger.warning(`Huh, ${details.user} appeared to already be in the database?`)
  }

  // Update the account for the first time.
  await updateAccount(true, client, details.user, hash)

  stateSet('account', { hash, user: details.user })
  stateSet('state', 'mail')
  stateCheck()
}

async function listAccounts () {
  return accounts.findAsync({})
}

async function editAccount (email, updates) {
  return accounts.updateAsync({ user: email }, { $set: updates })
}

module.exports = { addAccount, listAccounts, editAccount }