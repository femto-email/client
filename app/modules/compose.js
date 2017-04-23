const $ = require('jquery')
const jetpack = require('fs-jetpack')

const { remote } = require('electron')

global.app = remote.app
global.appDir = jetpack.cwd(app.getAppPath())
global.storeDir = jetpack.cwd(app.getPath('userData'))
global.state = storeDir.read('./state.json', 'json') || { state: 'new' }

$('html')[0].innerHTML = appDir.read(`./app/main.html`)

$('#header').html(appDir.read(`./app/header.html`))
document.getElementById('min-btn').addEventListener('click', function (e) { remote.BrowserWindow.getFocusedWindow().minimize() })
document.getElementById('max-btn').addEventListener('click', function (e) {
  let remoteWindow = remote.BrowserWindow.getFocusedWindow()
  remoteWindow.isMaximized() ? remoteWindow.unmaximize() : remoteWindow.maximize()
})
document.getElementById('close-btn').addEventListener('click', function (e) { remote.BrowserWindow.getFocusedWindow().close() })

$('#title').html(`
  <a href="#!" class="breadcrumb">Maily</a>
  <a href="#!" class="breadcrumb">${state.account.user}</a>
  <a href="#!" class="breadcrumb">Compose</a>
`)

