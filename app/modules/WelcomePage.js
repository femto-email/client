const $ = require('jquery')

function WelcomePage () {}

WelcomePage.load = function () {
	if (!testLoaded('welcome')) return

	logger.log('Loading up the welcome page...')
	page('welcome', ['basic', 'welcome'])

	if (process.env.NODE_ENV !== 'production') fillFields()

  $('#login-form').on('submit', async function onLogin (e) {
    e.preventDefault()
    let details = Utils.getItemsFromForm('login-form')
  	AccountManager.addAccount(details)
  })
}

/**
 * When we're not in production, we can keep user information in a
 * .env file so that we don't have to enter it every time.
 * @return {undefined}
 */
function fillFields () {
  $('#host_outgoing').val(process.env.HOST_OUTGOING)
  $('#port_outgoing').val(process.env.PORT_OUTGOING)
  $('#host').val(process.env.HOST)
  $('#port').val(process.env.PORT)
  $('#email').val(process.env.EMAIL)
  $('#password').val(process.env.PASSWORD)
  $('#secure').prop('checked', process.env.SECURE === 'true')
}

module.exports = WelcomePage