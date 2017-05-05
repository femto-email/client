const jetpack = require('fs-jetpack')
const Datastore = require('nedb')
const Promise = require('bluebird')
const crypto = require('crypto')
const $ = require('jquery')
const { remote } = require('electron')

/**
 * Sets and saves a config value to the config file.
 *
 * @param  {string} value
 * @param  {all} option
 * @return {undefined}
 */
global.configSet = (option, value) => {
  config[option] = value
  storeDir.write('config.json', config)
}

/**
 * Sets and saves a state value to the state file.
 *
 * @param  {string} valu
e * @param  {all} option
 * @return {undefined}
 */
global.stateSet = (option, value) => {
  state[option] = value
  storeDir.write('state.json', state)
}

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
function setup () {
  global.connections = {}
  global.mailStore = {}
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

  global.config = storeDir.read('./config.json', 'json') || {}
  global.state = storeDir.read('./state.json', 'json') || { state: 'new' }

  global.accounts = new Datastore({
    filename: app.getPath('userData') + '/db/accounts.db',
    autoload: true
  })

  global.accounts = Promise.promisifyAll(accounts)

  accounts.ensureIndex({ fieldName: 'user', unique: true })

  refreshAllAccounts()
  setInterval(refreshAllAccounts, 300000)

  global.setupComplete = true
  logger.debug(`Setup complete, we've read the config file and loaded the databases.`)

  stateCheck()
}

/**
 * State check is called when the current state changes, and handles switching
 * between the states.
 *
 * @return {undefined}
 */
global.stateCheck = () => {
  switch (state.state) {
    case 'new':
      logger.debug(`This is a new user, we'll welcome them in to the application.`)
      router.navigate('/welcome')
      break
    case 'mail':
      logger.debug(`This user has logged in, we need to show them their email.`)
      router.navigate('/mail')
      break
    default:
      logger.warning(`Unknown state?  This should never happen.  The state was ${state.state}`)
  }
}

/**
 * Attempts to transform an email address into a DB.
 *
 * @return {string}
 */
global.setupMailDB = async (email) => {
  let hash = crypto.createHash('md5').update(email).digest('hex')

  global.mailStore[hash] = Promise.promisifyAll(new Datastore({
    filename: `${app.getPath('userData')}/db/${hash}.db`
  }))

  await mailStore[hash].loadDatabaseAsync()

  mailStore[hash].ensureIndex({ fieldName: 'uid', unique: true })

  return hash
}

module.exports = { setup }
