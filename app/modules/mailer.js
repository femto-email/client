const Imap = require('imap')
const Promise = require('bluebird')
const simpleParser = require('mailparser').simpleParser
const util = require('util')

let imapLogger = process.env.NODE_END === 'production' || 0 ? function (string) {} : function (string) {
  // Obfuscate passwords.
  if (string.includes('=> \'A1 LOGIN')) {
    let array = string.split('"')
    for (let i = 1; i < array.length; i += 2) {
      array[i] = array[i].replace(/./g, '*')
    }
    string = array.join('"')
  }
  logger.debug(string)
}

/**
 * Logs in a user to their preferred mailing server.
 *
 * @param  {object} details
 * @return {promise}
 */
function login (details) {
  return new Promise((resolve, reject) => {
    let client = Promise.promisifyAll(new Imap(Object.assign(details, { debug: imapLogger })))

    client.once('ready', () => { resolve(client) })
    client.once('error', reject)
    client.once('end', reject)

    client.connect()
  })
}

/**
 * Retrieves all mailboxes from a users account.
 *
 * @param  {object} client
 * @return {array}
 */
async function getMailboxes (client) {
  return client.getBoxesAsync()
}

/**
 * Opens a mailbox given it's path.
 *
 * @param {object} client
 * @return {object}
 */
async function openMailbox (client, path) {
  if (typeof path !== 'string') path = compilePath(path)
  if (client.state === 'disconnected') client = await login(client._config)
  logger.log(`Opening mailbox: ${path}`)
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      client.openBox(path, false, (err, mailbox) => {
        if (err) logger.error(err)
        else {
          // console.log(mailbox)
          resolve(mailbox)
        }
      })
    })
  })
}

global.compilePath = (path) => {
  // We have to compile it ourselves.
  let compiledPath = ''
  for (let i = 0; i < path.length - 1; i++) {
    compiledPath += path[i].name + path[i].delimiter
  }
  compiledPath += path[path.length - 1].name
  return compiledPath
}

/**
 * Retrieves all emails past a point from a client.
 * Every time a message is loaded, loadedMessage is called
 * with the message number, the contents and attributes of the message.
 *
 * @param  {object} client
 * @param  {boolean} readOnly
 * @param  {integer} lowestSeq
 * @param  {function} loadedMessage
 * @return {promise}
 */
async function getNewEmails (client, readOnly, lowestSeq, loadedMessage) {
  lowestSeq = lowestSeq || 1
  loadedMessage = loadedMessage || function (seqno, msg, attributes) {}
  return new Promise((resolve, reject) => {
    let f = client.seq.fetch(`${lowestSeq}:*`, {
      bodies: 'HEADER.FIELDS (TO FROM SUBJECT)',
      struct: false,
      envelope: true
    })
    f.on('message', (msg, seqno) => {
      let content
      let attributes
      // logger.log(`Message #${seqno}`)
      msg.on('body', (stream, info) => {
        let buffer = ''
        stream.on('data', (chunk) => {
          buffer += chunk.toString('utf8')
        })
        stream.once('end', () => {
          content = buffer
          // logger.debug(`#${seqno} Parsed header: ${JSON.stringify(parsedContent)}`)
        })
      })
      msg.once('attributes', (attrs) => {
        attributes = attrs
        // logger.debug(`#${seqno} Attributes: ${util.inspect(attrs, false, 4)}`)
      })
      msg.once('end', async () => {
        // logger.debug(`#${seqno} Finished`)
        // logger.log(content)
        let parsedContent = await simpleParser(content)
        loadedMessage(seqno, parsedContent, attributes)
      })
    })
    f.once('error', (err) => {
      logger.error(`Fetch error: ${err}`)
      reject(err)
    })
    f.once('end', () => {
      logger.success(`Done fetching all messages!`)
      resolve()
    })
  })
}

async function getEmailBody (client, folder, seqno, loadedMessage) {
  return new Promise((resolve, reject) => {
    let f = client.seq.fetch(`${seqno}`, {
      bodies: '',
      struct: true,
      envelope: true
    })
    f.on('message', (msg, seqno) => {
      let content
      let attributes
      // logger.log(`Message #${seqno}`)
      msg.on('body', (stream, info) => {
        let buffer = ''
        stream.on('data', (chunk) => {
          buffer += chunk.toString('utf8')
        })
        stream.once('end', () => {
          content = buffer
          // logger.debug(`#${seqno} Parsed header: ${JSON.stringify(parsedContent)}`)
        })
      })
      msg.once('attributes', (attrs) => {
        attributes = attrs
        // logger.debug(`#${seqno} Attributes: ${util.inspect(attrs, false, 4)}`)
      })
      msg.once('end', async () => {
        // logger.debug(`#${seqno} Finished`)
        // logger.log(content)
        let parsedContent = await simpleParser(content)
        loadedMessage(parsedContent, attributes)
      })
    })
    f.once('error', (err) => {
      logger.error(`Fetch error: ${err}`)
      reject(err)
    })
    f.once('end', () => {
      logger.success(`Done fetching message html`)
      resolve()
    })
  })
}

function applyThreads (mail) {
  let objectMail = {}
  for (let i = 0; i < mail.length; i++) {
    if (mail[i].envelope.messageId) {
      objectMail[mail[i]._id] = {
        messageId: mail[i].envelope.messageId,
        inReplyTo: mail[i].envelope.inReplyTo || undefined
      }
    }
  }
  return generateReplyMap(objectMail)
}

function clean (obj) {
  for (var propName in obj) {
    if (typeof obj[propName] === 'object' && obj[propName].length === 0) {
      delete obj[propName]
    }
  }
  return obj
}

function findAllChildren (root, children) {
  let result = children[root] || []
  for (let child of result) {
    result = result.concat(findAllChildren(child, children))
  }
  return result
}

function generateReplyMap (messages) {
  let ids = {}
  for (let [id, message] of Object.entries(messages)) {
    ids[message.messageId] = id
  }

  let children = {}
  for (let [id, message] of Object.entries(messages)) {
    let parentId = ids[message.inReplyTo]
    children[parentId] = children[parentId] || []
    children[parentId].push(id)
  }

  let result = {}
  for (let child of children[undefined]) {
    result[child] = findAllChildren(child, children)
  }
  return clean(result)
}

/**
 * Removes any circular elements from an object, replacing them with "Circular".
 *
 * @param  {object} object
 * @return {object}
 */
function removeCircular (object) {
  var str = util.inspect(object, { depth: null })
  str = str
    .replace(/<Buffer[ \w\.]+>/ig, '"buffer"')
    .replace(/\[Function]/ig, 'function(){}')
    .replace(/\[Circular]/ig, '"Circular"')
    .replace(/\{ \[Function: ([\w]+)]/ig, '{ $1: function $1 () {},')
    .replace(/\[Function: ([\w]+)]/ig, 'function $1(){}')
    .replace(/(\w+): ([\w :]+GMT\+[\w \(\)]+),/ig, '$1: new Date("$2"),')
    .replace(/(\S+): ,/ig, '$1: null,')
  return JSON.parse(JSON.stringify((new Function('return ' + str + ';'))()))
}

function checkTrash (folder) {
  let exists = false
  for (let i = 0; i < folder.length; i++) {
    if (folder[i].name.toLowerCase() === 'trash') {
      exists = true
      continue
    }
    if (exists) {
      return true
    }
  }
  return false
}

function refreshEmail (client, email) {
  // TODO
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
  return mailStore[hash].insertAsync(Object.assign(msg, attributes, { seqno: seqno, uid: folder + seqno, folder: folder, date: +new Date(attributes.date) })).catch(function mailError (reason) {
    // logger.warning(`Seq #${seqno} couldn't be saved to the database because of "${reason}"`)
    if (String(reason).indexOf('it violates the unique constraint') !== -1) {
      return mailStore[hash].updateAsync({ uid: folder + seqno }, Object.assign(msg, attributes, { seqno: seqno, folder: folder, uid: folder + seqno, date: +new Date(attributes.date) }))
    }
  })
}

global.loadMail = (email, hash, uid) => {
  if (typeof mailStore[hash] === 'undefined') {
    setupMailDB(email)
  }

  return mailStore[hash].findOneAsync({ uid: uid })
}

module.exports = { login, getMailboxes, getNewEmails, removeCircular, openMailbox, compilePath, checkTrash, applyThreads, getEmailBody }
