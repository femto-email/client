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

  logger.log(`Loading mail window complete.`)
}

module.exports = { mail }