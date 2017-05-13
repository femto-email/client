const domainList = require('../generated-data/email_format_general')
const $          = require('jquery')

function WelcomePage () {}

WelcomePage.load = function () {
	if (!testLoaded('welcome')) return

	logger.log('Loading up the welcome page...')
	StateManager.page('welcome', ['basic', 'welcome'])

	if (process.env.NODE_ENV !== 'production') fillFields()

  $('#login-form').on('submit', async function onLogin (e) {
    e.preventDefault()
    let details = Utils.getItemsFromForm('login-form')
  	AccountManager.addAccount(details)
  })

  $('#email').on('blur', function onBlur (e) {
    let domain = $('#email').val().split('@')[1]
    if (!domain) return
    if (domain in domainList) {
      if ('imap' in domainList[domain]) {
        if ('ssl' in domainList[domain].imap) {
          if (!$('#host').val()) $('#host').val(domainList[domain].imap.ssl.host)
          if (!$('#port').val()) $('#port').val(domainList[domain].imap.ssl.port)
          $('#secure').prop('checked', true)
        } else if ('unencrypted' in domainList[domain].imap) {
          if (!$('#host').val()) $('#host').val(domainList[domain].imap.unencrypted.host)
          if (!$('#port').val()) $('#port').val(domainList[domain].imap.unencrypted.port)
        }
      }
      if ('smtp' in domainList[domain]) {
        if ('ssl' in domainList[domain].imap) {
          if (!$('#host_outgoing').val()) $('#host_outgoing').val(domainList[domain].smtp.ssl.host)
          if (!$('#port_outgoing').val()) $('#port_outgoing').val(domainList[domain].smtp.ssl.port)
          $('#secure').prop('checked', true)
        } else if ('unencrypted' in domainList[domain].smtp) {
          if (!$('#host_outgoing').val()) $('#host_outgoing').val(domainList[domain].smtp.unencrypted.host)
          if (!$('#port_outgoing').val()) $('#port_outgoing').val(domainList[domain].smtp.unencrypted.port)
        }
      }
      Materialize.updateTextFields();
    }
  })

  $('#email').focus()
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