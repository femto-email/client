const simpleParser = require('mailparser').simpleParser
const Datastore    = require('nedb')
const bluebird     = require('bluebird')
const jetpack      = require('fs-jetpack')
const merge        = require('merge-deep')
const util         = require('util')
const IMAP         = require('imap')
const _            = require('lodash')

/**
 * Logs the user in to their email server.
 * @param  {object}  details [An object which contains the server details and logon.]
 * @param  {boolean} debug   [A boolean to enable verbose logging to console.]
 * @return {promise}         [This promise resolves when the client connection finishes.]
 */
function IMAPClient(details) {
  // Jetpack is used in order to write to the log files, which are organised
  // by day (yyyy-mm-dd.log).
  this.jetpack = jetpack.cwd(app.getPath('userData'), 'logs')
  // Grabs the current day, for use in writing to the log files.
  this.currentDate = this.getDate()
  // Set current account details
  this.email = details.user

  return new Promise(((resolve, reject) => {
    // Login to the mail server using the details given to us.
    this.client = bluebird.promisifyAll(
      new IMAP(Object.assign(details, { debug: this.logger() }))
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

IMAPClient.compileObjectPath = function (path) {
  let location = []
  for (let j = 0; j < path.length; j++) {
    location.push(path[j].name)
    if (j !== path.length - 1) location.push('children')
  }
  return location
}

IMAPClient.linearBoxes = function (folders, path) {
  let keys = folders ? Object.getOwnPropertyNames(folders) : []
  let results = []
  path = path || []
  for (let i = 0; i < keys.length; i++) {
    results = results.concat(this.linearBoxes(folders[keys[i]].children, path.concat({
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
IMAPClient.prototype.getBoxes = async function () {
  await this.check_client()
  return this.client.getBoxesAsync()
}

/**
 * Opens a box on the server, given it's path
 * @param  {string}  path     [A string containing the path to the box]
 * @param  {boolean} readOnly [Whether the box is to be opened in read only mode or not]
 * @return {promise}          [A promise which resolves when the box has been opened]
 */
IMAPClient.prototype.openBox = async function (path, readOnly) {
  await this.check_client()
  return new Promise((async (resolve, reject) => {
    let folder = await this.client.openBoxAsync(path, readOnly || false)
    this.currentPath = path
    resolve(folder)
  }).bind(this))
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
  await this.check_client()
  // Ensure we have the right box open
  if (this.currentPath !== path) this.mailbox = await this.openBox(path, readOnly)
  // There are two ways we're going to want to grab emails, either:
  //   'lowest:*'
  //   'seqno'
  // If we want the former, we expect the `grabNewer` boolean to be true.
  return new Promise(function (resolve, reject) {
    // logger.log("Total: " + this.mailbox.messages.total)
    // logger.log("Seqno: " + seqno)
    // logger.log("grabNewer: " + grabNewer)
    // logger.log("Grabbing: " + `${seqno}${grabNewer ? `:*` : ``}`)
    if (!this.mailbox.messages.total) return resolve()
    // Outlook puts folders in the trash, which we can't retrieve at the moment.
    // if (path.toLowerCase().split('trash').length > 1) return resolve()
    let f = this.client.seq.fetch(`${seqno}${grabNewer ? `:*` : ``}`, struct)
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
        if (typeof onLoad === 'function') onLoad(seqno, parsedContent, attributes)
      })
    })
    f.once('error', (err) => {
      logger.error(`Fetch error: ${err}`)
      reject(err)
    })
    f.once('end', () => {
      resolve()
    })
  }.bind(this))
}

IMAPClient.prototype.getEmailBody = async function (uid) {
  await this.check_client()
  return new Promise(async function (resolve, reject) {
    let email = this.client._config.user
    let message = await MailStore.loadEmail(email, uid)

    await this.getEmails(message.folder, true, false, message.seqno, {
      bodies: '', struct: true, envelope: true
    }, async function (seqno, content, attributes) {
      let compiledContent = Object.assign({ seqno: seqno }, content, attributes)
      MailStore.saveMailBody(email, uid, compiledContent)
      await MailStore.updateEmailByUid(email, uid, { retrieved: true })
      logger.log(`Added ${email}:${uid} to the file system.`)
      resolve(compiledContent)
    })
  }.bind(this))
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
IMAPClient.prototype.updateAccount = async function () {
  /*----------  GRAB USER MAILBOXES  ----------*/
  $('#doing').text('grabbing your mailboxes.')
  await this.check_client()
  let boxes = await this.getBoxes()
  let boxesLinear = IMAPClient.linearBoxes(boxes)
  let email = this.client._config.user
  let hash = Utils.md5(email)

  /*----------  MERGE NEW FOLDERS WITH OLD  ----------*/
  let updateObject = (await AccountManager.findAccount(email)).folders || {}
  updateObject = merge(updateObject, Utils.removeCircular(boxes))
  logger.log(`Retrieved all mailboxes from ${email}`)

  /*----------  GRAB USER EMAILS  ----------*/
  $('#doing').text('getting your emails.')
  let totalEmails = 0

  boxesLinear.reverse()
  boxesLinear = boxesLinear.filter((n) => { return n != undefined && JSON.stringify(n) != '[]' })

  for (let i = 0; i < boxesLinear.length; i++) {
    let path = IMAPClient.compilePath(boxesLinear[i])
    // logger.debug("Path:", path)
    // logger.debug("Linear Box Path:", boxesLinear[i])
    let objectPath = IMAPClient.compileObjectPath(boxesLinear[i])
    // logger.debug("Object Path:", objectPath)
    let highest = _.get(updateObject, objectPath.concat(['highest']), 1)
    // logger.debug("Highest: " + highest)
    let isCurrentPath = StateManager.state && StateManager.state.account && IMAPClient.compilePath(StateManager.state.account.folder) == path
    let promises = []

    $('#doing').text(`grabbing ${boxesLinear[i][boxesLinear[i].length - 1].name}.`)

    await this.getEmails(path, true, true, highest, {
      bodies: 'HEADER.FIELDS (TO FROM SUBJECT)',
      envelope: true
    }, function onLoad(seqno, msg, attributes) {
      promises.push(MailStore.saveEmail(email, seqno, msg, attributes, path))
      if (isCurrentPath) this.viewChanged = true
      if (seqno > highest) highest = seqno
      $('#number').text(`(${++totalEmails})`)
    })

    await Promise.all(promises)

    _.set(updateObject, objectPath.concat(['highest']), highest)

    let boxKeys = Object.keys(this.mailbox)
    for (let j = 0; j < boxKeys.length; j++) {
      _.set(updateObject, objectPath.concat([boxKeys[j]]), this.mailbox[boxKeys[j]])
    }
  }

  /*----------  THREADING EMAILS  ----------*/
  $('#number').text('')
  $('#doing').text('looking for threads.')
  let threads = Threader.applyThreads(await MailStore.findEmails(hash))
  for (let id in threads) {
    await MailStore.updateEmailByUid(email, id, { threadMsg: threads[id] })
    for (let i = 0; i < threads[id].length; i++) {
      await MailStore.updateEmailByUid(email, threads[id][i], { isThreadChild: id })
    }
  }

  /*----------  RENDER, SAVE & CLOSE  ----------*/
  AccountManager.editAccount(email, { folders: Utils.removeCircular(updateObject) })
  this.client.end()
  $('#doing').text('getting your inbox setup.')

  StateManager.change('state', 'mail')
  StateManager.change('account', { hash, email })
  StateManager.update()
}

/**
 * A function which logs the specified string to the disk (and also to console
 * if debugging is enabled)
 * @param {string} string [The string that should be logged]
 */
IMAPClient.prototype.logger = function () {
  return function(string) {
    // Obfuscate passwords.
    if (string.includes('=> \'A1 LOGIN')) {
      let array = string.split('"')
      for (let i = 1; i < array.length; i += 2) {
        array[i] = array[i].replace(/./g, '*')
      }
      string = array.join('"')
    }

    this.jetpack.append(`./IMAP-${this.currentDate}.log`, logger.format(string) + '\n')
  }.bind(this)
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

IMAPClient.prototype.check_client = async function () {
  if (this.client.state === 'disconnected') {
    logger.log('Client disconnected, reconnecting.')
    this.client = await new IMAPClient(this.client._config)
  }
}

module.exports = IMAPClient
