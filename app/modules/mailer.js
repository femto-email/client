const imap = require('imap')
const Promise = require('bluebird')
const inspect = require('util').inspect
const simpleParser = require('mailparser').simpleParser

/**
 * Logs in a user to their preferred mailing server.
 * 
 * @param  {object} details
 * @return {promise}
 */
function login(details) {
  return new Promise((resolve, reject) => {
    let client = Promise.promisifyAll(new imap(details))

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

async function getNewEmails(client, readOnly, lowestUID, loadedMessage) {
  lowestUID = lowestUID || '1'
  loadedMessage = loadedMessage || function(seqno, msg) {}
  let box = await client.openBoxAsync('INBOX', readOnly)
  let f = client.seq.fetch(`${lowestUID}:2`, {
    bodies: 'HEADER'
  })
  f.on('message', (msg, seqno) => {
    logger.log(`Message #${seqno}`)
    msg.on('body', (stream, info) => {
      var buffer = ''
      stream.on('data', (chunk) => {
        buffer += chunk.toString('utf8')
      })
      stream.once('end', async () => {
        let parsedContent = await simpleParser(buffer)
        logger.log(`#${seqno} Parsed header: ${JSON.stringify(parsedContent)}`)
      })
    })
    msg.once('attributes', (attrs) => {
      logger.log(`#${seqno} Attributes: ${inspect(attrs, false, 4)}`)
    })
    msg.once('end', () => {
      logger.log(`#${seqno} Finished`)
      loadedMessage()
    })
  })
  f.once('error', (err) => {
    logger.log(`Fetch error: ${err}`)
  })
  f.once('end', () => {
    logger.log(`Done fetching all messages!`)
    client.end()
  })
}

module.exports = { login, getMailboxes, getNewEmails }