const { os } = require('os')
const { remote } = require('electron')
const Navigo = require('navigo')

require('dotenv').config()
require('./helpers/switch')
require('./helpers/utils')

const { setup } = require('./modules/setup')
const { welcome } = require('./modules/welcome')
const { mail } = require('./modules/mail')

global.mailer = require('./modules/mailer')
global.app = remote.app
global.router = new Navigo(null, true, '#')

router.on({
  '/setup': () => { timeFunc(setup) },
  '/welcome': () => { timeFunc(welcome) },
  '/mail': () => { timeFunc(mail) }
}).resolve()

router.navigate('/setup')