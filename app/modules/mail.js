const $ = require('jquery')

async function mail() {
  if (!testLoaded('mail')) return

  logger.debug(`We're loading up the mail page now.`)
  page('mail', ['basic', 'mail'])

  if (typeof state.account == 'undefined' || 1) {
    // I have no idea when this happens, but just in case
    let doc = await new Promise((resolve, reject) => {
      accounts.find({}).sort({ date: 0 }).limit(1).exec((err, docs) => {
        if (err) return reject(err)
        resolve(docs[0])
      })
    })
    stateSet('account', { hash: doc.hash, user: doc.user })
  }

  if (typeof state.account.folder == 'undefined') {
    stateSet('account', Object.assign(state.account, { folder: 'INBOX' }))
  }

  let account = (await accounts.findAsync({ user: state.account.user }, {}))[0]
  let folders = htmlFolders(organiseFolders(account.folders))
  let linearFolders = findFolders(account.folders)

  $('#folders').html(folders)
  $('#linear-folders').html(JSON.stringify(linearFolders))

  if (typeof mailStore[state.account.hash] == 'undefined') {
    setupMailDB(state.account.user)
  }

  $('#mail').text(JSON.stringify((await mailStore[state.account.hash].findAsync({}))[0]))

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

    // Attach a shadow root to <e-mail>.
    const shadowRoot = this.attachShadow({mode: 'open'})
    shadowRoot.innerHTML = `
      <div id="email">This is a random email item... :)</div>
    `
  }
})

$(document).scroll(() => {
  // this = some random div object, gained from something like:
  // $('e-mail').each(function(){
  // if($(this).offset().top + $(this).height() > cutoff){
})

module.exports = { mail }