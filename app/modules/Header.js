const { remote } = require('electron')
const jetpack   = require('fs-jetpack')
const $         = require('jquery')

function Header () {}

Header.load = function () {
  let appDir = jetpack.cwd(app.getAppPath())

  $(() => {
    $('#header').html(appDir.read(`./app/header.html`))
    document.getElementById('min-btn').addEventListener('click', function (e) { remote.BrowserWindow.getFocusedWindow().minimize() })
    document.getElementById('max-btn').addEventListener('click', function (e) {
      let remoteWindow = remote.BrowserWindow.getFocusedWindow()
      remoteWindow.isMaximized() ? remoteWindow.unmaximize() : remoteWindow.maximize()
    })
    document.getElementById('close-btn').addEventListener('click', function (e) { remote.BrowserWindow.getFocusedWindow().close() })
  })
}

Header.setLoc = function (parts) {
  parts = ['Femto'].concat(parts)

  let html = ''
  for (let i = 0; i < parts.length; i++) {
    html += `<a href="#!" class="breadcrumb">${parts[i]}</a>`
  }

  $('#title').html(html)
}

module.exports = Header