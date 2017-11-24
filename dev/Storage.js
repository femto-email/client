const Datastore = require('nedb')

class Storage {
  constructor() {
    this.accounts = this.init('accounts')
    this.mail = this.init('mail')
  }

  init(file) {
    return new Datastore({
      filename: `storage/${file}.db`,
      autoload: true
    })
  }
}

module.exports = Storage