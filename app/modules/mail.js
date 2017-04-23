const $ = require('jquery')
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
    stateSet('account', Object.assign(state.account, { folder: [{ name: 'Inbox', delimiter: findSeperator(account.folders) }] }))
  }

  $('#folders').html(folders)

  linkFolders($('#folders').children().children())
  updateMailDiv()

  logger.log(`Loading mail window complete.`)
}

async function updateMailDiv () {
  let mail = await new Promise((resolve) => {
    mailStore[state.account.hash].find({ folder: mailer.compilePath(state.account.folder) }).sort({ date: -1 }).exec((err, docs) => {
      resolve(docs)
    })
  })

  $('#mail').html('')

  $('#title').html(`
    <a href="#!" class="breadcrumb">Maily</a>
    <a href="#!" class="breadcrumb">${state.account.user}</a>
  `)

  for (let i = 0; i < state.account.folder.length; i++) {
    $('#title').append(`<a href="#!" class="breadcrumb">${state.account.folder[i].name}</a>`)
  }

  for (let i = 0; i < mail.length; i++) {
    $('#mail').append($(`<e-mail class="email-item" data-uid="${escape(mail[i].uid)}"></e-mail>`))
  }

  $('.email-item').off('click')

  $('.email-item').click((e) => {
    loadEmail(e.currentTarget.attributes['data-uid'].nodeValue)
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

function htmlFolders (tree, journey) {
  journey = journey || []
  let html = ''
  for (let prop in tree) {
    temp = journey.concat({ name: prop, delimiter: tree[prop].delimiter })
    // html += `
    //   <div class="col s12 no-padding center-align">
    //     <div class="waves-effect waves-teal btn-flat wide no=padding" id="${btoa(JSON.stringify(temp))}">${prop} ${htmlFolders(tree[prop].children, temp)}</div>
    //   </div>
    // `
    html += `
      <div class="col s12 no-padding center-align">
        <div class="waves-effect waves-teal btn-flat wide no=padding" id="${btoa(JSON.stringify(temp))}">${prop}</div>
      </div>
    `
    html += htmlFolders(tree[prop].children, temp)
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
        <div class="collection-item avatar">
          <img src="http://placehold.it/100x100" alt="" class="circle">
          <span class="title">${escapeHTML(mail.subject)}</span>
          <p>${escapeHTML(mail.from ? mail.from.text : 'No Sender?')}</p>
          <a href="#!" class="secondary-content">${formatDate(mail.date)}</a>
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
