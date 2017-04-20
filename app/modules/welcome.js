const $ = require('jquery')
const _ = require('lodash')

async function welcome() {
  if (!testLoaded('welcome')) return

  logger.debug(`We're loading up the welcome page now.`)
  page('welcome', ['basic', 'welcome'])

  if (process.env.NODE_ENV != 'production') { fillFields() }

  $('#login-form').on('submit', async function onLogin(e) {
    e.preventDefault()
    let details = getItemsFromForm('login-form')
    $('.wrapper').html(`
    <span id="doing"></span> <span id="number"></span><br>
    <span id="mailboxes"></span>
    `)
    $('#doing').text('logging you in.')
    let client = await mailer.login(details)
    logger.log(`Successfully logged in to user ${details.user}.`)

    $('#doing').text('creating a database for your mail.')
    let hash = await setupMailDB(details.user)
    logger.log(`Successfully created a database account for ${details.user}`)

    try {
      $('#doing').text('saving your account for the future.')
      let doc = await accounts.insertAsync(Object.assign(details, { hash: hash, date: +new Date() }))
      logger.log(`Added ${details.user} to the accounts database.`)
    } catch(e) {
      logger.warning(`Huh, ${details.user} appeared to already be in the database?`)
    }

    $('#doing').text('grabbing your mailboxes.')
    let mailboxes = await mailer.getMailboxes(client)
    let update = await accounts.updateAsync({ user: details.user }, { $set: { folders: mailer.removeCircular(mailboxes) }})
    let linearFolders = findFolders(mailboxes)

    logger.log(`Retrieved all mailboxes from ${details.user}`)
    $('#doing').text('getting your emails.')
    let total = 0

    logger.log(JSON.stringify(linearFolders))

    linearFolders.reverse()

    linearFolders = linearFolders.filter(function(n){ return n != undefined && JSON.stringify(n) != '[]' })

    console.log(mailboxes)

    linearFolders = [linearFolders[0]]

    console.log(linearFolders)

    for (let i = 0; i < linearFolders.length; i++) {
      $('#doing').text(`grabbing ${linearFolders[i][linearFolders[i].length - 1].name}.`)
      // $('#mailboxes').append('<br />' + JSON.stringify(linearFolders[i]))
      console.log("Opening folder: " + JSON.stringify(linearFolders[i]))
      let mailbox = await mailer.openMailbox(client, linearFolders[i])
      logger.log(`Successfully loaded mailbox: ${mailbox.name}`)

      let highest = 0
      let promises = []
      let emails = await mailer.getNewEmails(client, true, '1', (seqno, msg, attributes) => {
        if (seqno > highest) {
          highest = seqno
        }
        promises.push(saveMail(details.user, hash, linearFolders[i], seqno, msg, attributes))
        total++
        $('#number').text(`(${total})`)
      })

      await Promise.all(promises)

      let location = []
      for (let j = 0; j < linearFolders[i].length; j++) {
        location.push(linearFolders[i][j].name)
        location.push('children')
      }

      location.pop()
      _.set(mailboxes, location.concat(['highest']), highest)

      let data = Object.keys(mailbox)

      for (let j = 0; j < data.length; j++) {
        _.set(mailboxes, location.concat(data[j]), mailbox[data[j]])
      }
    }

    // logger.log(mailboxes)

    await accounts.updateAsync({ user: details.user }, { $set: { folders: mailer.removeCircular(mailboxes) }})

    $('#number').text('')
    $('#doing').text('getting your inbox setup.')

    stateSet('account', { hash, user: details.user })
    stateSet('state', 'mail')
    stateCheck()
  })
}

/**
 * When we're not in production, we can keep user information in a
 * .env file so that we don't have to enter it every time.
 * 
 * @return {[type]} [description]
 */
function fillFields() {
  $('#domain').val(process.env.DOMAIN)
  $('#port').val(process.env.PORT)
  $('#email').val(process.env.EMAIL)
  $('#password').val(process.env.PASSWORD)
  $('#secure').prop('checked', process.env.SECURE == 'true')
}

module.exports = { welcome }