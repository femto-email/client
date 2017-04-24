const { remote, ipcRenderer } = require('electron')
const Navigo = require('navigo')

require('dotenv').config()
require('./helpers/switch')
require('./helpers/utils')
require('./helpers/clean')

const { setup } = require('./modules/setup')
const { welcome } = require('./modules/welcome')
const { mail } = require('./modules/mail')

global.mailer = require('./modules/mailer')
global.users = require('./modules/users')
global.sender = require('./modules/sender')
global.app = remote.app
global.router = new Navigo(null, true, '#')

router.on({
  '/setup': () => { timeFunc(setup) },
  '/welcome': () => { timeFunc(welcome) },
  '/mail': () => { timeFunc(mail) }
}).resolve()

router.navigate('/setup')
