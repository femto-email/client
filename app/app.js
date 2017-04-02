const { os } = require('os')
const { remote } = require('electron')
const { setup } = require('./modules/setup')
const { welcome } = require('./modules/welcome')
const Navigo = require('navigo')

global.logger = require('./helpers/logger')
global.mailer = require('./modules/mailer')
global.app = remote.app
global.router = new Navigo(null, true, '#')

require('dotenv').config()
require('./helpers/switch')
require('./helpers/utils')

router.on({
  '/setup': () => { setup() },
  '/welcome': () => { welcome() },
  '/mail': () => { mail() }
}).resolve()

router.navigate('/setup')