const simpleParser = require('mailparser').simpleParser
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

    this.client.once('ready', () => { resolve() })
    this.client.once('error', (err) => { throw err })
    this.client.connect()
  }).bind(this)) // Sets the Promise() `this` to the object `this`.
}

/**
 * Turns an array of path components into a single string.
 * @param  {array}  path An array of path components
 * @return {string}      A string representing the path to a box
 */
IMAPClient.compilePath = (path) => {
  let compiledPath = ''
  for (let i = 0; i < path.length - 1; i++) {
    compiledPath += path[i].name + path[i].delimiter
  }
  compiledPath += path[path.length - 1].name
  return compiledPath
}

IMAPClient.saveEmail = (email, seqno, msg, attributes, folder) => {
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

IMAPClient.loadEmail = (email, uid) => {
  const hash = Utils.md5(email)
  if (typeof mailStore[hash] === 'undefined') setupMailDB(email)
  return mailStore[hash].findOneAsync({ uid: uid })
}

global.saveMail = (email, hash, folder, seqno, msg, attributes) => {
  if (typeof mailStore[hash] === 'undefined') {
    setupMailDB(email)
  }
  if (typeof folder !== 'string') folder = compilePath(folder)

  // Here, we use folder + seqno as our unique identifier between each mail item.  It is guarenteed to be unique
  // unless UIDValidity changes, whereupon I believe our only option is to purge the database and regather all
  // the information we need.
  // (This is yet to be implemented, we just hope it doesn't change for now)
  return mailStore[hash].insertAsync(Object.assign(msg, attributes, { user: email, seqno: seqno, uid: folder + seqno, folder: folder, date: +new Date(attributes.date) })).catch(function mailError (reason) {
    // logger.warning(`Seq #${seqno} couldn't be saved to the database because of "${reason}"`)
    if (String(reason).indexOf('it violates the unique constraint') !== -1) {
      return mailStore[hash].updateAsync({ uid: folder + seqno }, Object.assign(msg, attributes, { user: email, seqno: seqno, folder: folder, uid: folder + seqno, date: +new Date(attributes.date) }))
    }
  })
}

global.loadMail = (email, hash, uid) => {
  if (typeof mailStore[hash] === 'undefined') {
    setupMailDB(email)
  }

  return mailStore[hash].findOneAsync({ uid: uid })
}

/**
 * Returns all boxes within a mail account.
 * @return {object} [An object containing all mailboxes]
 */
IMAPClient.prototype.getBoxes = () => {
  return this.client.getBoxesAsync()
}

/**
 * Opens a box on the server, given it's path
 * @param  {string}  path     [A string containing the path to the box]
 * @param  {boolean} readOnly [Whether the box is to be opened in read only mode or not]
 * @return {promise}          [A promise which resolves when the box has been opened]
 */
IMAPClient.prototype.openBox = async (path, readOnly) => {
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

IMAPClient.prototype.getEmails = async (path, readOnly, grabNewer, seqno, struct, onLoad) => {
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
 * A function which logs the specified string to the disk (and also to console
 * if debugging is enabled)
 * @param {string} string [The string that should be logged]
 */
IMAPClient.prototype.logger = (string) => {
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
IMAPClient.prototype.getDate = () => {
  const today = new Date()
  let day = today.getDate()
  let month = today.getMonth() + 1
  let year = today.getFullYear()
  return `${year}-${month}-${day}`
}

module.exports = IMAPClient