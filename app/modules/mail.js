const $ = require('jquery')
const _ = require('lodash')
const crypto = require('crypto')
const formatDate = require('../helpers/date.js')
const { ipcRenderer } = require('electron')

async function mail () {
  if (!testLoaded('mail')) return

  logger.debug(`We're loading up the mail page now.`)
  page('mail', ['basic', 'mail'])

  $('#compose-button').click(() => {
    ipcRenderer.send('open', { file: 'compose' })
  })

  if (typeof state.account === 'undefined') {
    // I have no idea when this happens, but just in case
    // Perhaps this could happen if someone deleted their state.json file?
    // Or it was unreadable.
    let doc = await new Promise((resolve, reject) => {
      accounts.find({}).sort({ date: 0 }).limit(1).exec((err, docs) => {
        if (err) return reject(err)
        resolve(docs[0])
      })
    })
    stateSet('account', Object.assign(state.account, { hash: doc.hash, user: doc.user }))
  }

  let account = (await accounts.findAsync({ user: state.account.user }, {}))[0]
  let folders = htmlFolders(account.folders)

  if (typeof mailStore[state.account.hash] === 'undefined') {
    setupMailDB(state.account.user)
  }

  if (typeof state.account.folder === 'undefined') {
    // Here, we somewhat fake the folder tree for the inbox folder.
    // We don't really need the seperator, in this instance it should never be used,
    // but we keep it just in case.
    stateSet('account', Object.assign(state.account, {
      folder: [{
        name: 'INBOX',
        delimiter: findSeperator(account.folders)
      }]
    }))
  }

  if (typeof account.folders[state.account.folder[0].name] === 'undefined') {
    stateSet('account', Object.assign(state.account, { 
      folder: [{
        name: 'Inbox',
        delimiter: findSeperator(account.folders)
      }]
    }))
  }

  $('#folders').html(folders)

  linkFolders($('#folders').children().children())
  updateMailDiv()

  logger.log(`Loading mail window complete.`)
}

global.refreshAllAccounts = async () => {
  logger.log('We\'re refreshing all email accounts.')
  let users = await accounts.findAsync({})
  for (let i = 0; i < users.length; i++) {
    refreshAccount({
      user: users[i].user,
      password: users[i].password,
      tls: users[i].tls,
      host: users[i].imap.host,
      port: users[i].imap.port
    })
  }
}

async function refreshAccount(details) {
  let client = await mailer.login(details)
  let hash = await setupMailDB(details.user)
  logger.log(`Initiating refresh for ${details.user}`)
  await updateAccount(false, client, details.user, hash)
}

global.updateMailDiv = async () => {
  let mail = await new Promise((resolve) => {
    mailStore[state.account.hash].find({ folder: mailer.compilePath(state.account.folder) }).sort({ date: -1 }).exec((err, docs) => {
      resolve(docs)
    })
  })

  $('#mail').html('')

  $('#title').html(`
    <a href="#!" class="breadcrumb">Femto</a>
    <a href="#!" class="breadcrumb">${state.account.user}</a>
  `)

  for (let i = 0; i < state.account.folder.length; i++) {
    $('#title').append(`<a href="#!" class="breadcrumb">${state.account.folder[i].name}</a>`)
  }

  let html = ""
  for (let i = 0; i < mail.length; i++) {
    html += `<e-mail class="email-item" data-uid="${escape(mail[i].uid)}"></e-mail>`
  }
  $('#mail').html($(html))

  if (mail.length === 0) {
    // This folder is empty...
    $('#mail').html('This folder is empty ;(')
  }

  $('.email-item').off('click')

  $('.email-item').click((e) => {
    loadEmail(unescape(e.currentTarget.attributes['data-uid'].nodeValue))
  })
}

/**
 * Currently not functioning.
 *
 * @param  {object} tree
 * @return {object}
 */
function organiseFolders (tree) {
  let keys = Object.getOwnPropertyNames(tree)
  let results = {}
  for (let i = 0; i < keys.length; i++) {
    if (tree[keys[i]].children) {
      results[keys[i]] = organiseFolders(tree[keys[i]].children)
    } else {
      results[keys[i]] = {}
    }
  }
  return results
}

/**
 * Update all emails for a specific account, also used for the first
 * grab of emails.
 *
 * @param  {boolean} isFirstTime
 * @param  {object} client
 * @param  {string} user
 * @param  {string} hash
 * @return {undefined}
 */
global.updateAccount = async (isFirstTime, client, user, hash) => {
  $('#doing').text('grabbing your mailboxes.')
  let mailboxes = await mailer.getMailboxes(client)
  let linearFolders = findFolders(mailboxes)
  let updateObject = undefined

  if (isFirstTime) {
    updateObject = mailer.removeCircular(mailboxes)
  } else {
    // We start by grabbing the older items.
    let oldMailbox = (await accounts.findAsync({ user: user }))[0].folders

    // Then, we deep merge with the new items.
    // Don't give deep merge circular mailbox objects, otherwise it loops infinitely.
    updateObject = mergeDeep(oldMailbox, mailer.removeCircular(mailboxes))
  }

  logger.log(`Retrieved all mailboxes from ${user}`)
  $('#doing').text('getting your emails.')
  let total = 0
  let alteredView = false

  linearFolders.reverse()
  linearFolders = linearFolders.filter((n) => { return n != undefined && JSON.stringify(n) != '[]' })
  logger.log(JSON.stringify(linearFolders))
  // linearFolders = [linearFolders[26]]

  console.log(linearFolders)

  for (let i = 0; i < linearFolders.length; i++) {
    // Fix Outlook being able to chuck folders in the trash, not in RFC.
    // if (mailer.checkTrash(linearFolders[i])) continue

    $('#doing').text(`grabbing ${linearFolders[i][linearFolders[i].length - 1].name}.`)
    // $('#mailboxes').append('<br />' + JSON.stringify(linearFolders[i]))
    console.log('Opening folder: ' + JSON.stringify(linearFolders[i]))
    let mailbox = await mailer.openMailbox(client, linearFolders[i])
    let path = compilePath(linearFolders[i])
    console.log(mailbox)
    logger.log(`Successfully loaded mailbox: ${mailbox.name}`)

    let location = []
    for (let j = 0; j < linearFolders[i].length; j++) {
      location.push(linearFolders[i][j].name)
      location.push('children')
    }
    location.pop()

    let highest = _.get(updateObject, location.concat(['highest']), 0)
    let unread = 0
    if (mailbox.messages.total) {
      let promises = []
      // Set the third parameter to be either undefined (if first time grabbing folder)
      // Or the current highest grabbed index (if not first time grabbing folder)
      let emails = await mailer.getNewEmails(client, true, highest || undefined, (seqno, msg, attributes) => {
        if (seqno > highest) {
          highest = seqno
        }
        // For some unknown reason, msg.flags doesn't exist here?  But it does when commented out.
        // if (!msg.flags.includes('\\Seen')) unread++
        promises.push(saveMail(user, hash, linearFolders[i], seqno, msg, attributes))

        if (!isFirstTime) {
          // Check we're on the right user & folder.
          if (path == compilePath(state.account.folder) && user == state.account.user) {
            // We're currently viewing this thread!
            let uid = path + seqno
            console.log(`Downloaded a new visible email, ${uid}`)
            alteredView = true
          }
        }

        total++
        $('#number').text(`(${total})`)
      })

      await Promise.all(promises)
    }

    if (mailbox.messages.total) _.set(updateObject, location.concat(['highest']), highest)
    _.set(updateObject, location.concat(['unread']), unread)

    let data = Object.keys(mailbox)

    console.log(mailbox)
    for (let j = 0; j < data.length; j++) {
      _.set(updateObject, location.concat(data[j]), mailbox[data[j]])
    }
  }

  $('#number').text('')
  $('#doing').text('looking for threads.')

  let threads = mailer.applyThreads(await mailStore[hash].findAsync({}))

  console.log(threads)

  for (let id in threads) {
    // logger.debug('Setting Parent Thread: ' + id)
    await mailStore[hash].updateAsync({ _id: id }, { $set: { threadMsg: threads[id] } }, {})

    for (let i = 0; i < threads[id].length; i++) {
      // logger.debug('Setting Thread Child: ' + threads[id][i])
      await mailStore[hash].updateAsync({ _id: threads[id][i] }, { $set: { isThreadChild: id } }, {})
    }
  }

  if (alteredView) {
    updateMailDiv()
  }

  // logger.log(mailboxes)

  await accounts.updateAsync({ user: user }, { $set: { folders: mailer.removeCircular(updateObject) }})

  $('#doing').text('getting your inbox setup.')
}

function htmlFolders (tree, journey) {
  journey = journey || []
  let html = ''
  for (let prop in tree) {
    temp = journey.concat({ name: prop, delimiter: tree[prop].delimiter })
    // Folders with depth
    html += `
      <div class="col s12 no-padding center-align">
        <div class="waves-effect waves-teal btn-flat wide no=padding folder-tree" id="${btoa(JSON.stringify(temp))}">${prop} ${htmlFolders(tree[prop].children, temp)}</div>
      </div>
    `
    // Folders without depth
    // html += `
    //   <div class="col s12 no-padding center-align">
    //     <div class="waves-effect waves-teal btn-flat wide no=padding" id="${btoa(JSON.stringify(temp))}">${prop}</div>
    //   </div>
    // `
    // html += htmlFolders(tree[prop].children, temp)
  }
  return html
}

function linkFolders (children) {
  children.each((index, item) => {
    $(`#${item.id.replace(/=/g, '\\=')}`).click((element) => {
      logger.log(`Switching page to ${atob(element.target.id)}`)
      stateSet('account', Object.assign(state.account, {
        folder: JSON.parse(atob(element.target.id))
      }))
      $(`.folder-tree`).removeClass('teal')
      $(`#${element.target.id.replace(/=/g, '\\=')}`).addClass('teal')
      updateMailDiv()
    })

    let items = $(`#${item.id.replace(/=/g, '\\=')}`).children().children()
    if (items.length) {
      linkFolders(items)
    }
  })
}

function loadEmail (uid) {
  console.log(uid)
}

global.findFolders = (folders, path) => {
  let keys = folders ? Object.getOwnPropertyNames(folders) : []
  let results = []
  path = path || []
  for (let i = 0; i < keys.length; i++) {
    let tempPath = JSON.parse(JSON.stringify(path))
    tempPath.push({ delimiter: folders[keys[i]].delimiter, name: keys[i]})
    results = results.concat(findFolders(folders[keys[i]].children, tempPath))
  }
  results.push(path)
  return results
}

global.findSeperator = (folders) => {
  // We assume they use one delimiter for the entire inbox, otherwise...
  // Well, I worry for their health..
  // Try not to use this function too much, at some point I intend to deprecate it.
  return typeof folders.INBOX === 'undefined' ? folders.Inbox.delimiter : folders.INBOX.delimiter
}

// Possibly also document.registerElement()?
customElements.define('e-mail', class extends HTMLElement {
  constructor () {
    super()

    // Shadow root is it's *own* entire DOM.  This makes it impact less when
    // we change and search through other parts of the DOM, *hopefully* making it
    // slightly quicker.  It also allows us to use the cool <e-mail> tags.
    // const shadowRoot = this.attachShadow({ mode: 'open' })

    this.innerHTML = `
      <div>Loading...</div>
    `

    // We're able to assume some values from the current state.
    // However, we don't rely on it, preferring instead to find it in the email itself.
    let email = this.getAttribute('data-email') ||
                state.account.user
    let hash = this.getAttribute('data-hash') ||
                crypto.createHash('md5').update(email).digest('hex') ||
                state.account.hash
    let uid = unescape(this.getAttribute('data-uid'))

    loadMail(email, hash, uid).then((mail) => {
      // Attach a shadow root to <e-mail>.
      // NOTE: All of these *have* to be HTML escaped.  Consider using `escapeHTML(string)` which
      // is globally accessible.
      this.innerHTML = `
        <div class="mail-item">
          <div class="multi"><input type="checkbox" id="${mail.uid}" />
            <label for="${mail.uid}"></label>
          </div>
          <div class="text ${mail.flags.includes('\\Seen') ? `read` : `unread`}">
            <div class="subject">
              <div class="subject-text">${escapeHTML(mail.subject)}</div>
            </div>
            <div class="sender">
              <div class="sender-text">${escapeHTML(typeof mail.from !== 'undefined' ? mail.from.value[0].name || mail.from.value[0].address : 'No Sender...')}</div>
            </div>
            <div class="date teal-text right-align">${formatDate(mail.date)}</div>
          </div>
        </div>
      `
    })
  }
})

/*
<div id="${btoa(mail.uid)}" class="email" style="border: 1px solid black;">
  UID: ${escapeHTML(mail.uid)}<br />
  Subject: ${escapeHTML(mail.subject)}<br />
  From: ${escapeHTML(mail.from ? mail.from.text : 'No Sender?')}<br />
  Flags: ${escapeHTML(JSON.stringify(mail.flags))}<br />
  Folder: ${escapeHTML(mail.folder)}<br />
  ModSeq: ${mail.modseq}<br />
  Date: ${formatDate(mail.date)}<br />
  ${mail.threadMsg ? `Children: ${JSON.stringify(mail.threadMsg)}<br />` : ``}
  ChildMsg: ${mail.isThreadChild ? `Yes` : `No`}
</div>
*/

module.exports = { mail }
