const Datastore = require('nedb')
const Promise = require('bluebird')
const $ = require('jquery')

function AccountManager () {
	this.accounts = Promise.promisifyAll(new Datastore({
	  filename: app.getPath('userData') + '/db/accounts.db',
	  autoload: true
	}))

  this.accounts.ensureIndex({ fieldName: 'user', unique: true })
  this.addAccount = addAccount
  this.listAccounts = listAccounts
  this.editAccount = editAccount
  this.removeAccount = removeAccount
}

async function addAccount (details) {
  /*----------  OVERLAY PROCESSING MODAL  ----------*/
  $('.wrapper').html(`
    <span id="doing"></span> <span id="number"></span><br>
    <span id="mailboxes"></span>
  `)

  /*----------  LOG USER IN  ----------*/
  $('#doing').text('logging you in.')
  let client = await (new IMAPClient(details))
  logger.log(`Successfully logged in to user ${details.user}.`)

  global.x = client

  /*----------  CREATE ACCCOUNT DATABASE  ----------*/
  $('#doing').text('creating a database for your mail.')
  await IMAPClient.createEmailDB(details.user)
  logger.log(`Successfully created a database account for ${details.user}`)

  /*----------  REFORMAT DETAILS OBJECT  ----------*/
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
    hash: Utils.md5(details.user),
    date: +new Date()
  }

  /*----------  SAVE ACCOUNT TO ACCOUNTS DB  ----------*/
  try {
    $('#doing').text('saving your account for the future.')
  	await this.accounts.insertAsync(details)
    logger.log(`Added ${details.user} to the accounts database.`)
  } catch(e) {
    logger.warning(`Huh, ${details.user} appeared to already be in the database?`)
  }

  /*----------  UPDATE MAIL ITEMS FOR ACCOUNT  ----------*/
  await client.updateAccount()

  /*----------  SWITCH TO THAT USER  ----------*/
  StateManager.change('account', { hash, user: details.user })
  StateManager.change('state', 'mail')
  StateManager.update()
}

async function listAccounts () {
  return this.accounts.findAsync({})
}

async function listAccount (email) {
  return (await this.accounts.findAsync({ user: email }))[0] || {}
}

async function editAccount (email, changes) {
  return this.accounts.updateAsync({ user: email }, { $set: changes })
}

async function removeAccount (email) {
	return this.accounts.removeAsync({ user: email })
}

module.exports = new AccountManager()