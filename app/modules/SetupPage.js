const jetpack = require('fs-jetpack')
const Datastore = require('nedb')
const Promise = require('bluebird')
const crypto = require('crypto')
const $ = require('jquery')
const { remote } = require('electron')

/**
 * Tests whether the setup has been completed.
 *
 * @param  {string} page
 * @return {undefined}
 */
global.testLoaded = (page) => {
  if (typeof setupComplete === 'undefined' || !setupComplete) {
    logger.warning(`We tried to load ${page}, but setup hadn't completed yet, likely caused by the user refreshing the page.`)
    return false
  }
  return true
}

/**
 * Setup is called when the application is run, it retrieves required
 * databases and files, and works out the current state.
 *
 * @return {undefined}
 */
function SetupPage () {}

SetupPage.load = function () {
  global.appDir = jetpack.cwd(app.getAppPath())
  global.storeDir = jetpack.cwd(app.getPath('userData'))

  $(() => {
    $('#header').html(appDir.read(`./app/header.html`))
    document.getElementById('min-btn').addEventListener('click', function (e) { remote.BrowserWindow.getFocusedWindow().minimize() })
    document.getElementById('max-btn').addEventListener('click', function (e) {
      let remoteWindow = remote.BrowserWindow.getFocusedWindow()
      remoteWindow.isMaximized() ? remoteWindow.unmaximize() : remoteWindow.maximize()
    })
    document.getElementById('close-btn').addEventListener('click', function (e) { remote.BrowserWindow.getFocusedWindow().close() })
  })

  logger.log(`Application Paths Found:
    App Dir   - ${app.getAppPath()}
    Store Dir - ${app.getPath('userData')}
    Temp Dir  - ${app.getPath('temp')}`)
  logger.debug(`Other Paths Found:
    Exe Path  - ${app.getPath('exe')}
    Desktop   - ${app.getPath('desktop')}
    Documents - ${app.getPath('documents')}`)

  // refreshAllAccounts()
  // setInterval(refreshAllAccounts, 300000)

  global.setupComplete = true
  logger.debug(`Setup complete, we've read the config file and loaded the databases.`)

  StateManager.update()
}

module.exports = SetupPage
