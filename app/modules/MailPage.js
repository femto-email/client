const { ipcRenderer } = require('electron')
const $               = require('jquery')

function MailPage () {}

MailPage.load = async function () {
	if (!testLoaded('mail')) return

	logger.debug(`We're loading up the mail page now.`)
  StateManager.page('mail', ['basic', 'mail'])

  /*----------  ACTIVATE MAIL BUTTON  ----------*/
  $('#compose-button').click(() => {
    ipcRenderer.send('open', { file: 'compose' })
  })

  if (typeof StateManager.state.account === 'undefined') {
  	let account = (await AccountManager.listAccounts())[0]
  	StateManager.change('account', Object.assign(StateManager.state.account, { hash: account.hash, user: account.user }))
  }

  let account = await AccountManager.findAccount(StateManager.state.account.user)
  let folders = account.folders

  $('#folders').html(MailPage.generateFolderList(folders))

  throw "Error, MailPage has not been finished yet."
}

MailPage.generateFolderList = function () {
	// TO DO
	return "TODO"
}

module.exports = MailPage