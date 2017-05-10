const Datastore = require('nedb')
const Promise = require('bluebird')

function AccountManager () {
	this.accounts = Promise.promisifyAll(new Datastore({
	  filename: app.getPath('userData') + '/db/accounts.db',
	  autoload: true
	}))

  accounts.ensureIndex({ fieldName: 'user', unique: true })
}

AccountManager.addAccount = (details) => {
	return this.accounts.insertAsync(details)
}

AccountManager.listAccounts = async () => {
  return this.accounts.findAsync({})
}

AccountManager.editAccount = async (email, changes) => {
  return this.accounts.updateAsync({ user: email }, { $set: changes })
}

AccountManager.removeAccount = (email) => {
	return this.accounts.removeAsync({ user: email })
}

module.exports = AccountManager