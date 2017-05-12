const Datastore = require('nedb')
const bluebird  = require('bluebird')

function MailStore () {}

MailStore.saveEmail = async function (email, seqno, msg, attributes, folder) {
  const hash = Utils.md5(email)
  if (typeof this[hash] === 'undefined') setupMailDB(email)
  let mail = Object.assign(
    msg, 
    attributes, 
    { seqno, folder, user: email, uid: folder + seqno, date: +new Date(attributes.date) }
  )
  // `folder + seqno` are guarenteed to be unique unless UIDValidity changes, which we
  // currently are unable to detect.
  return this[hash].insertAsync(mail).catch((reason) => {
    if (~String(reason).indexOf('it violates the unique constraint')) {
      return this[hash].updateAsync({ uid: folder + seqno }, mail)
    }
  })
}

MailStore.loadEmail = async function (email, uid) {
  const hash = Utils.md5(email)
  if (typeof this[hash] === 'undefined') setupMailDB(email)
  return this[hash].findOneAsync({ uid: uid })
}

/**
 * Attempts to transform an email address into a DB.
 * @param  {string}    email [An email address to create the DB instance of]
 * @return {undefined}
 */
MailStore.createEmailDB = async function (email) {
  // Detect whether we need to hash it ourselves, or if it is
  // already hashed.
  let hash = ~email.indexOf('@') ? Utils.md5(email) : email
  if (typeof this[hash] === 'undefined') {
    this[hash] = bluebird.promisifyAll(new Datastore({
      filename: `${app.getPath('userData')}/db/${hash}.db`
    }))

    await this[hash].loadDatabaseAsync()

    this[hash].ensureIndex({ fieldName: 'uid', unique: true })
  }
}

MailStore.updateEmail = async function (email, id, changes) {
  // Detect whether we need to hash it ourselves, or if it is
  // already hashed.
  let hash = ~email.indexOf('@') ? Utils.md5(email) : email
  return await this[hash].updateAsync({ _id: id }, { $set: changes }, {})
}

MailStore.findEmails = async function (email, folder, limits, skip, limit) {
  // Detect whether we need to hash it ourselves, or if it is
  // already hashed.
  let hash = ~email.indexOf('@') ? Utils.md5(email) : email
  return await new Promise((resolve) => {
    this[hash].find(
      folder ? { folder: IMAPClient.compilePath(folder) } : {},
      limits ? limits: {}
    ).sort({ date: -1 }).skip(skip).limit(limit).exec((err, docs) => {
      resolve(docs)
    })
  })
}

MailStore.countEmails = async function (email, folder) {
  // Detect whether we need to hash it ourselves, or if it is
  // already hashed.
  let hash = ~email.indexOf('@') ? Utils.md5(email) : email
  return await this[hash].countAsync({ folder: IMAPClient.compilePath(folder) })
}

module.exports = MailStore