async function addAccount(details) {
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

  linearFolders.reverse()
  linearFolders = linearFolders.filter(function(n){ return n != undefined && JSON.stringify(n) != '[]' })
  logger.log(JSON.stringify(linearFolders))
  // linearFolders = [linearFolders[26]]

  console.log(linearFolders)

  for (let i = 0; i < linearFolders.length; i++) {
    // Fix Outlook being able to chuck folders in the trash, not in RFC.
    // if (mailer.checkTrash(linearFolders[i])) continue

    $('#doing').text(`grabbing ${linearFolders[i][linearFolders[i].length - 1].name}.`)
    // $('#mailboxes').append('<br />' + JSON.stringify(linearFolders[i]))
    console.log("Opening folder: " + JSON.stringify(linearFolders[i]))
    let mailbox = await mailer.openMailbox(client, linearFolders[i])
    console.log(mailbox)
    logger.log(`Successfully loaded mailbox: ${mailbox.name}`)

    let highest = 0
    if (mailbox.messages.total) {
      let promises = []
      let emails = await mailer.getNewEmails(client, true, undefined, (seqno, msg, attributes) => {
        if (seqno > highest) {
          highest = seqno
        }
        promises.push(saveMail(details.user, hash, linearFolders[i], seqno, msg, attributes))
        total++
        $('#number').text(`(${total})`)
      })

      await Promise.all(promises)
    }

    let location = []
    for (let j = 0; j < linearFolders[i].length; j++) {
      location.push(linearFolders[i][j].name)
      location.push('children')
    }

    location.pop()
    if (mailbox.messages.total) _.set(mailboxes, location.concat(['highest']), highest)

    let data = Object.keys(mailbox)

    for (let j = 0; j < data.length; j++) {
      _.set(mailboxes, location.concat(data[j]), mailbox[data[j]])
    }
  }

  $('#number').text('')
  $('#doing').text('looking for threads.')

  let threads = mailer.applyThreads(await mailStore[hash].findAsync({}))

  console.log(threads)

  for (let id in threads) {
    console.log("Setting Parent Thread: " + id)
    await mailStore[hash].updateAsync({ _id: id }, { $set: { threadMsg: threads[id] } }, {})

    for (let i = 0; i < threads[id].length; i++) {
      console.log("Setting Thread Child: " + threads[id][i])
      await mailStore[hash].updateAsync({ _id: threads[id][i] }, { $set: { isThreadChild: id } }, {})
    }
  }

  // logger.log(mailboxes)

  await accounts.updateAsync({ user: details.user }, { $set: { folders: mailer.removeCircular(mailboxes) }})

  $('#doing').text('getting your inbox setup.')

  stateSet('account', { hash, user: details.user })
  stateSet('state', 'mail')
  stateCheck()
}

async function listAccounts() {
  return await accounts.findAsync({})
}

module.exports = { addAccount, listAccounts }