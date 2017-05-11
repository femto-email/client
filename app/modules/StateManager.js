const jetpack = require('fs-jetpack')
const $       = require('jquery')

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

/**
 * This function enables an array of CSS files, whilst disabling
 * the rest.
 *
 * @param  {array} titles
 * @return {undefined}
 */
StateManager.prototype.style = function (titles) {
  for (let i = 0; i < document.styleSheets.length; i++) {
    let shouldEnable = titles.includes(document.styleSheets[i].ownerNode.getAttribute('data-name')) || document.styleSheets[i].ownerNode.getAttribute('data-name').includes('all-')

    document.styleSheets[i].disabled = !shouldEnable

    if (titles.includes(document.styleSheets[i].ownerNode.getAttribute('data-name'))) {
      titles.splice(titles.indexOf(document.styleSheets[i].ownerNode.getAttribute('data-name')), 1)
    }
  }
  if (titles.length) {
    logger.error(`Warning, ${titles} was/were not found within the list of stylesheets.`)
    logger.log(document.styleSheets)
  }
}

/**
 * Page handles all our application state switching by enabling
 * and disabling CSS, and loading the HTML into the body of the
 * application
 *
 * @param  {string} page
 * @param  {array} css
 * @return {undefined}
 */
StateManager.prototype.page = function (page, css) {
  logger.debug(`Switching page to ${page}`)
  $('#content').html(appDir.read(`./app/${page}.html`))
  style(css)
}


module.exports = new StateManager()