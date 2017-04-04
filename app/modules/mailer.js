const imap = require('imap')
const Promise = require('bluebird')
const inspect = require('util').inspect
const simpleParser = require('mailparser').simpleParser
const util = require('util')

/**
 * Logs in a user to their preferred mailing server.
 * 
 * @param  {object} details
 * @return {promise}
 */
function login(details) {
  return new Promise((resolve, reject) => {
    let imapLogger = function(string) { logger.debug(string) }
    let client = Promise.promisifyAll(new imap(Object.assign(details, { debug: imapLogger })))

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
async function getMailboxes(client) {
  return await client.getBoxesAsync()
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
async function getNewEmails(client, readOnly, lowestSeq, loadedMessage) {
  lowestSeq = lowestSeq || '1'
  loadedMessage = loadedMessage || function(seqno, msg, attributes) {}
  let box = await client.openBoxAsync('INBOX', readOnly)
  return new Promise((resolve, reject) => {
    let f = client.seq.fetch(`${lowestSeq}:2`, {
      bodies: 'HEADER'
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
        // logger.debug(`#${seqno} Attributes: ${inspect(attrs, false, 4)}`)
      })
      msg.once('end', async () => {
        logger.debug(`#${seqno} Finished`)
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
      client.end()
      resolve()
    })
  })
}

function removeCircular(object) {
  str = util.inspect(object, { depth: null })
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

global.saveMail = (email, hash, seqno, msg, attributes) => {
  if (typeof mailStore[hash] == 'undefined') {
    setupMailDB(email)
  }

  return mailStore[hash].insertAsync(Object.assign({ seqno: seqno }, msg, attributes)).catch(function mailError(reason) {
    logger.warning(`Seq #${seqno} couldn't be saved to the database because of "${reason}"`)
  })
}

module.exports = { login, getMailboxes, getNewEmails, removeCircular }