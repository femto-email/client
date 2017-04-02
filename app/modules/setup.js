const jetpack = require('fs-jetpack')
const Datastore = require('nedb')
const Promise = require('bluebird')

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
 * Tests whether the setup has been completed.
 * 
 * @param  {string} page
 * @return {undefined}
 */
global.testLoaded = (page) => {
  if (typeof setupComplete == 'undefined' || !setupComplete) {
    logger.log(`We tried to load ${page}, but setup hadn't completed yet.`)
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
function setup() {
  global.appDir = jetpack.cwd(app.getAppPath())
  global.storeDir = jetpack.cwd(app.getPath('userData'))

  global.config = storeDir.read('config.json', 'json') || {}
  global.state = storeDir.read('state.json', 'json') || { state: 'new' }

  global.accounts = Promise.promisifyAll(new Datastore({ 
    filename: app.getPath('userData') + '/db/accounts.db',
    autoload: true
  }))

  accounts.ensureIndex({ fieldName: 'user', unique: true })

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
function stateCheck() {
  switch(state.state) {
    case 'new':
      logger.debug(`This is a new user, we'll welcome them in to the application.`)
      router.navigate('/welcome')
      break
    default:
      logger.warning(`Unknown state?  This should never happen.  The state was ${state.state}`)
  }
}

module.exports = { setup }