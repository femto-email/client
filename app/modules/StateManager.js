const jetpack = require('fs-jetpack')

function StateManager () {
  this.storeDir = jetpack.cwd(app.getPath('userData'))
  this.state = this.storeDir.read('./state.json', 'json') || { state: 'new' }
}

/**
 * Sets and saves a state value to the state file.
 *
 * @param  {string} value
 * @param  {all} option
 * @return {undefined}
 */
StateManager.prototype.change = function (option, value) {
  this.state[option] = value
  this.storeDir.write('state.json', this.state)
}
/**
 * State check is called when the current state changes, and handles switching
 * between the states.
 *
 * @return {undefined}
 */
StateManager.prototype.update = function () {
  switch (this.state.state) {
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

module.exports = new StateManager()