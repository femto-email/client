const simpleParser = require('mailparser').simpleParser
const Datastore    = require('nedb')
const bluebird     = require('bluebird')
const jetpack      = require('fs-jetpack')
const path         = require('path')
const util         = require('util')
const IMAP         = require('imap')

/**
 * Logs the user in to their email server.
 * @param  {object}  details [An object which contains the server details and logon.]
 * @param  {boolean} debug   [A boolean to enable verbose logging to console.]
 * @return {promise}         [This promise resolves when the client connection finishes.]
 */
function IMAPClient(details) {
  // If debug mode is enabled, log all interactions with the IMAP server to
  // console.  Otherwise, log them to a folder.
  this.debug = process.env.DEBUG === 'true'
  // Jetpack is used in order to write to the log files, which are organised
  // by day (yyyy-mm-dd.log).
  this.jetpack = jetpack.cwd(path.join(app.getPath('userData'), 'logs'))
  // Grabs the current day, for use in writing to the log files.
  this.currentDate = this.getDate()

  return new Promise(((resolve, reject) => {
    // Login to the mail server using the details given to us.
    this.client = bluebird.promisifyAll(
      new IMAP(Object.assign(details, { debug: this.imapLogger }))
    )

    this.client.once('ready', () => { resolve(this) })
    this.client.once('error', (err) => { throw err })
    this.client.connect()
  }).bind(this)) // Sets the Promise() `this` to the object `this`.
}

/**
 * Turns an array of path components into a single string.
 * @param  {array}  path An array of path components
 * @return {string}      A string representing the path to a box
 */
IMAPClient.compilePath = function (path) {
  let compiledPath = ''
  for (let i = 0; i < path.length - 1; i++) {
    compiledPath += path[i].name + path[i].delimiter
  }
  compiledPath += path[path.length - 1].name
  return compiledPath
}

IMAPClient.saveEmail = async function (email, seqno, msg, attributes, folder) {
  const hash = Utils.md5(email)
  if (typeof mailStore[hash] === 'undefined') setupMailDB(email)
  let mail = Object.assign(
    msg, 
    attributes, 
    { seqno, folder, user: email, uid: folder + seqno, date: +new Date(attributes.date) }
  )
  // `folder + seqno` are guarenteed to be unique unless UIDValidity changes, which we
  // currently are unable to detect.
  return mailStore[hash].insertAsync(mail).catch((reason) => {
    if (~String(reason).indexOf('it violates the unique constraint')) {
      return mailStore[hash].updateAsync({ uid: folder + seqno }, mail)
    }
  })
}

IMAPClient.loadEmail = async function (email, uid) {
  const hash = Utils.md5(email)
  if (typeof mailStore[hash] === 'undefined') setupMailDB(email)
  return mailStore[hash].findOneAsync({ uid: uid })
}

/**
 * Attempts to transform an email address into a DB.
 * @param  {string}    email [An email address to create the DB instance of]
 * @return {undefined}
 */
IMAPClient.createEmailDB = async function (email) {
  // Detect whether we need to hash it ourselves, or if it is
  // already hashed.
  hash = ~email.indexOf('@') ? Utils.md5(email) : email
  global.mailStore[hash] = bluebird.promisifyAll(new Datastore({
    filename: `${app.getPath('userData')}/db/${hash}.db`
  }))

  await mailStore[hash].loadDatabaseAsync()

  mailStore[hash].ensureIndex({ fieldName: 'uid', unique: true })
}

IMAPClient.linearBoxes = function (folders, path) {
  let keys = folders ? Object.getOwnPropertyNames(folders) : []
  let results = []
  path = path || []
  for (let i = 0; i < keys.length; i++) {
    results = results.concat(this.findFolders(folders[keys[i]].children, path.concat({ 
      delimiter: folders[keys[i]].delimiter, 
      name: keys[i]
    })))
  }
  results.push(path)
  return results
}

/**
 * Returns all boxes within a mail account.
 * @return {object} [An object containing all mailboxes]
 */
IMAPClient.prototype.getBoxes = function () {
  return this.client.getBoxesAsync()
}

/**
 * Opens a box on the server, given it's path
 * @param  {string}  path     [A string containing the path to the box]
 * @param  {boolean} readOnly [Whether the box is to be opened in read only mode or not]
 * @return {promise}          [A promise which resolves when the box has been opened]
 */
IMAPClient.prototype.openBox = async function (path, readOnly) {
  if (this.client.state === 'disconnected') this.client = await new IMAPClient(this.client._config, this.debug)
  return new Promise(async (resolve, reject) => {
    let folder = await this.client.openBoxAsync(path, readOnly || false)
    this.currentPath = path
    resolve(folder)
  }).call(this)
}

/**
 * Retrieve some/all of the emails from the server.
 * @param  {string}   path      [A path to a specific box]
 * @param  {boolean}  readOnly  [Whether to open the box in read only mode or not]
 * @param  {boolean}  grabNewer [Whether to retrieve items after the sequence number or not]
 * @param  {number}   seqno     [The specific sequence number to grab]
 * @param  {object}   struct    [Which parts of the message to retrieve]
 * @param  {function} onLoad    [A function which is called with each individual message]
 * @return {promise}            [Resolved when all messages have been retrieved, or a fatal error occurred]
 */

// {
//   bodies: '',
//   struct: true,
//   envelope: true
// }

IMAPClient.prototype.getEmails = async function (path, readOnly, grabNewer, seqno, struct, onLoad) {
  // Ensure we have the right box open
  if (this.currentPath !== path) this.openBox(path, readOnly)
  // There are two ways we're going to want to grab emails, either:
  //   'lowest:*'
  //   'seqno'
  // If we want the former, we expect the `grabNewer` boolean to be true.
  return new Promise((resolve, reject) => {
    let f = client.seq.fetch(`${seqno}${grabNewer? `:*` : ``}`, struct)
    f.on('message', (msg, seqno) => {
      let content, attributes
      msg.on('body', (stream, info) => {
        let buffer = ''
        stream.on('data', (chunk) => {
          buffer += chunk.toString('utf8')
        })
        stream.once('end', () => {
          content = buffer
        })
      })
      msg.once('attributes', (attrs) => {
        attributes = attrs
      })
      msg.once('end', async () => {
        let parsedContent = await simpleParser(content)
        if (typeof onLoad === 'function') onLoad(parsedContent, attributes)
      })
    })
    f.once('error', (err) => {
      logger.error(`Fetch error: ${err}`)
      reject(err)
    })
    f.once('end', () => {
      resolve()
    })
  })
}

/**
 * Update all emails for a specific account, also used for the first
 * grab of emails.
 * @param  {boolean} isFirstTime
 * @param  {object} client
 * @param  {string} user
 * @param  {string} hash
 * @param  {boolean} shouldClose
 * @return {undefined}
 */
IMAPClient.prototype.updateAccount = async function (email) {
  $('#doing').text('grabbing your mailboxes.')
  let boxes = await this.client.getBoxes()
  let boxesLinear = IMAPClient.linearBoxes(boxes)

  let updateObject = await AccountManager.listAccount(email).folders || {}
  updateObject = Utils.deepMerge(updateObject, Utils.removeCircular(mailboxes))
  


  throw "Function not finished"
}

/**
 * A function which logs the specified string to the disk (and also to console
 * if debugging is enabled)
 * @param {string} string [The string that should be logged]
 */
IMAPClient.prototype.logger = function (string) {
  // Obfuscate passwords.
  if (string.includes('=> \'A1 LOGIN')) {
    let array = string.split('"')
    for (let i = 1; i < array.length; i += 2) {
      array[i] = array[i].replace(/./g, '*')
    }
    string = array.join('"')
  }

  if (this.debug) {
    logger.debug(string)
  }
  this.jetpack.appendAsync(`${this.currentDate}.log`, string)
}

/**
 * Retrieves the current date in the format of year-month-day.
 * @return {string} [A string containing the current date (yyyy-mm-dd)]
 */
IMAPClient.prototype.getDate = function () {
  const today = new Date()
  let day = today.getDate()
  let month = today.getMonth() + 1
  let year = today.getFullYear()
  return `${year}-${month}-${day}`
}

module.exports = IMAPClient