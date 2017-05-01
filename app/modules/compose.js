const $ = require('jquery')
const jetpack = require('fs-jetpack')
const Datastore = require('nedb')
const { remote, ipcRenderer } = require('electron')
global.Promise = require('bluebird')

global.app = remote.app
global.appDir = jetpack.cwd(app.getAppPath())
global.storeDir = jetpack.cwd(app.getPath('userData'))
global.state = storeDir.read('./state.json', 'json') || { state: 'new' }
global.accounts = new Datastore({
  filename: app.getPath('userData') + '/db/accounts.db',
  autoload: true
})
global.accounts = Promise.promisifyAll(accounts)

$('html')[0].innerHTML = appDir.read(`./app/main.html`)

$('#header').html(appDir.read(`./app/header.html`))
document.getElementById('min-btn').addEventListener('click', function (e) { remote.BrowserWindow.getFocusedWindow().minimize() })
document.getElementById('max-btn').addEventListener('click', function (e) {
  let remoteWindow = remote.BrowserWindow.getFocusedWindow()
  remoteWindow.isMaximized() ? remoteWindow.unmaximize() : remoteWindow.maximize()
})
document.getElementById('close-btn').addEventListener('click', function (e) { remote.BrowserWindow.getFocusedWindow().close() })

$('#title').html(`
  <a href="#!" class="breadcrumb">Femto</a>
  <a href="#!" class="breadcrumb">Compose</a>
`)

$('#content').html(appDir.read(`./app/compose_out.html`))

;(async () => {
  let accountList = await accounts.findAsync({})
  for (let i = 0; i < accountList.length; i++) {
    $('#from').append($('<option>', {
      value: accountList[i]._id,
      text: accountList[i].user
    }));
    console.log(accountList[i])
  }
})()

$('#send').click(() => {
  let message = {
    from: $('#from').val(),
    to: $('#to').val(),
    subject: $('#subject').val(),
    message: $('#message').val()
  }
  ipcRenderer.send('send', message)
})
