const simpleParser = require('mailparser').simpleParser
const bluebird     = require('bluebird')
const util         = require('util')
const Imap         = require('imap')

class Grabber {
  constructor(user, password, host, port, tls) {
    this.user = user
    this.password = password
    this.host = host
    this.port = port
    this.tls = tls
    this.box = null
  }

  static get HEADERS() {
    return {
      bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
      struct: true
    }
  }

  static get ALL() {
    return {
      bodies: '',
      struct: true,
      envelope: true,
    }
  }

  init() {
    return new Promise((resolve, reject) => {
      this.client = bluebird.promisifyAll(
        new Imap({
          user: this.user,
          password: this.password,
          host: this.host,
          port: this.port,
          tls: this.tls
        })
      )

      this.client.on('ready', () => { console.log(`Connection ready for ${this.user}`); resolve() })
      this.client.on('error', (reason) => { console.log(`Connection error for ${this.user}: ${reason}`) /* this.emit('error', reason) */ })
      this.client.on('end', () => { console.log(`Connection ended for ${this.user}`) /* this.emit('end') */ })

      this.client.connect()
    })
  }

  async read(box, sequence, fields, callback) {
    return new Promise(async (resolve, reject) => {
      await this.open(box)

      let fetch = this.client.seq.fetch(sequence, fields)

      fetch.on('message', (msg, seqno) => {
        let content, attributes
        msg.on('body', (stream, info) => {
          stream.on('data', (chunk) => {
            content += chunk.toString('utf8')
          })
        })

        msg.once('attributes', (attrs) => {
          attributes = attrs
        })

        msg.once('end', async () => {
          console.log(`${seqno}: Finished`)
          content = await simpleParser(content)
          if (typeof callback == 'function') callback({ seqno, content, attributes })
        })
      })

      fetch.once('error', (err) => {
        console.log(`Fetch error for ${this.user}, query [${box}, ${sequence}]`)
      })

      fetch.once('end', () => {
        console.log(`Fetch finished for ${this.user}, query [${box}, ${sequence}]`)
        resolve()
      })
    })
  }

  async open(box, read_only = false) {
    if (!this.box || this.box.name != box) {
      this.box = await this.client.openBoxAsync(box, read_only)
    }
  }

  add(box) {
    return this.client.addBoxAsync(box)
  }

  del(box) {
    return this.client.delBoxAsync(box)
  }

  rename(old_box, new_box) {
    return this.client.renameBoxAsync(old_box, new_box)
  }

  boxes() {
    return this.client.getBoxesAsync()
  }

  close() {
    return this.client.end()
  }
}

module.exports = Grabber