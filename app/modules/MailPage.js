const { ipcRenderer, remote } = require('electron')
const searchInPage            = require('electron-in-page-search').default
const $                       = require('jquery')

function MailPage () {}

MailPage.load = async function () {
  if (!testLoaded('mail')) return

  logger.debug(`We're loading up the mail page now.`)
  StateManager.page('mail', ['basic', 'mail'])

  /*----------  ACTIVATE MAIL BUTTON  ----------*/
  $('#compose-button').click(() => {
    ipcRenderer.send('open', { file: 'compose' })
  })

  /*----------  ENSURE ACCOUNT SET IN STATE  ----------*/
  if (typeof StateManager.state.account === 'undefined') {
    let account = (await AccountManager.listAccounts())[0]
    StateManager.change('account', Object.assign(StateManager.state.account, { hash: account.hash, user: account.user }))
  }

  /*----------  RETRIEVE & SETUP ACCOUNT  ----------*/
  let account = await AccountManager.findAccount(StateManager.state.account.email)
  let folders = account.folders
  await MailStore.createEmailDB(account.user)

  /*----------  ENSURE FOLDER SET IN STATE  ----------*/
  if (typeof StateManager.state.account.folder === 'undefined') {
    // Due to companies not all naming their main inbox "INBOX" (as defined in the RFC),
    // we have to search through them, looking for one which contains the word "inbox".
    for (let folder in folders) {
      if (folder.toLowerCase() == 'inbox') {
        StateManager.update('account', Object.assign(StateManager.state.account, {
          folder: [{ name: folder, delimiter: account.folders[folder].delimiter }]
        }))
      }
    }
  }

  /*----------  SET FOLDER LIST  ----------*/
  $('#folders').html(MailPage.generateFolderList(folders, [], false))
  MailPage.linkFolders($('#folders').children().children())
  MailPage.highlightFolder(StateManager.state.account.folder)

  /*----------  ADD MAIL ITEMS  ----------*/
  MailPage.render()
  MailPage.retrieveEmailBodies()

  /*----------  SEARCH IN MAIL WINDOW  ----------*/
  MailPage.enableSearch()

  throw "Error, MailPage has not been finished yet."
}

MailPage.generateFolderList = function (folders, journey, depth) {
  let html = ''
  for (let prop in folders) {
    temp = journey.concat({ name: prop, delimiter: folders[prop].delimiter })
    if (depth) {
      html += `
        <div class="col s12 no-padding center-align">
          <div class="waves-effect waves-teal btn-flat wide no=padding folder-tree" id="${btoa(JSON.stringify(temp))}">${prop} ${MailPage.generateFolderList(folders[prop].children, temp, depth)}</div>
        </div>
      `
    } else {
      html += `
        <div class="col s12 no-padding center-align">
          <div class="waves-effect waves-teal btn-flat wide no=padding folder-tree" id="${btoa(JSON.stringify(temp))}">${prop}</div>
        </div>
      `
      html += MailPage.generateFolderList(folders[prop].children, temp, depth)
    }
  }
  return html
  // TO DO
  return "TODO"
}

MailPage.linkFolders = function (item) {
  // TO DO
  return "TODO"
}

MailPage.highlightFolder = function (folder) {
  // TO DO
  return "TODO"
}

MailPage.render = function() {
  // TO DO
  return "TODO"
}

MailPage.retrieveEmailBodies = function() {
  // TO DO
  return "TODO"
}

MailPage.enableSearch = function() {
  const listener = new window.keypress.Listener()
  listener.simple_combo('ctrl f', () => {
    const searchInWindow = searchInPage(remote.getCurrentWebContents())
    searchInWindow.openSearchWindow()
  })
}

module.exports = MailPage