const $ = require('jquery')
const crypto = require('crypto')

async function mail() {
  if (!testLoaded('mail')) return

  logger.debug(`We're loading up the mail page now.`)
  page('mail', ['basic', 'mail'])

  if (typeof state.account == 'undefined') {
    // I have no idea when this happens, but just in case
    let doc = await new Promise((resolve, reject) => {
      accounts.find({}).sort({ date: 0 }).limit(1).exec((err, docs) => {
        if (err) return reject(err)
        resolve(docs[0])
      })
    })
    stateSet('account', Object.assign(state.account, { hash: doc.hash, user: doc.user }))
  }

  let account = (await accounts.findAsync({ user: state.account.user }, {}))[0]
  let folders = htmlFolders(organiseFolders(account.folders))
  let linearFolders = findFolders(account.folders)

  if (typeof state.account.folder == 'undefined') {
    // Here, we somewhat fake the folder tree for the inbox folder.
    // We don't really need the seperator, in this instance it should never be used,
    // but we keep it just in case.
    stateSet('account', Object.assign(state.account, { folder: [{ name: 'INBOX', delimiter: findSeperator(account.folders) }]}))
  }

  $('#folders').html(folders)
  $('#linear-folders').html(JSON.stringify(linearFolders))

  if (typeof mailStore[state.account.hash] == 'undefined') {
    setupMailDB(state.account.user)
  }

  // $('#mail').text(JSON.stringify((await mailStore[state.account.hash].findAsync({}))[0]))
  let mail = await mailStore[state.account.hash].findAsync({ folder: mailer.compilePath(state.account.folder) })
  
  for (let i = 0; i < mail.length; i++) {
    // We need to escape the folder system here before release.
    $('#mail').append($(`<e-mail data-uid="${mail[i].uid}"></e-mail>`))
  }
  console.log(mail)

  logger.log(`Loading mail window complete.`)
}

function organiseFolders(tree) {
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

function htmlFolders(tree) {
  let html = ''
  for (let prop in tree) {
    html += `<div>${prop} ${htmlFolders(tree[prop])}</div>`
  }
  return html
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
  return folders.INBOX.delimiter
}

// Possibly also document.registerElement()?
customElements.define('e-mail', class extends HTMLElement {
  constructor() {
    super()

    // Shadow root is it's *own* entire DOM.  This makes it impact less when
    // we change and search through other parts of the DOM, *hopefully* making it
    // slightly quicker.  It also allows us to use the cool <e-mail> tags.
    const shadowRoot = this.attachShadow({mode: 'open'})

    shadowRoot.innerHTML = `
      <div>Loading...</div>
    `

    // We're able to assume some values from the current state.
    // However, we don't rely on it, preferring instead to find it in the email itself.
    let email = this.getAttribute('data-email') || 
                state.account.user
    let hash  = this.getAttribute('data-hash') || 
                crypto.createHash('md5').update(email).digest('hex') || 
                state.account.hash
    let uid   = this.getAttribute('data-uid')

    let message = loadMail(email, hash, uid).then((mail) => {
      // Attach a shadow root to <e-mail>.
      // NOTE: All of these *have* to be HTML escaped.  Consider using `escapeHTML(string)` which
      // is globally accessible.
      shadowRoot.innerHTML = `
        <div class="email" style="border: 1px solid black;">
          UID: ${escapeHTML(mail.uid)}<br />
          Subject: ${escapeHTML(mail.subject)}<br />
          From: ${escapeHTML(mail.from ? mail.from.text : 'No Sender?')}<br />
          Flags: ${escapeHTML(JSON.stringify(mail.flags))}<br />
          Folder: ${escapeHTML(mail.folder)}<br />
          ModSeq: ${mail.modseq}
        </div>
      `
    })
  }
})

$(document).scroll(() => {
  // this = some random div object, gained from something like:
  // $('e-mail').each(function(){
  // if($(this).offset().top + $(this).height() > cutoff){
})

module.exports = { mail }