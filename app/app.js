const { remote, ipcRenderer } = require('electron')
const Navigo = require('navigo')

console.log("%cStop!", "font: 2em sans-serif; color: yellow; background-color: red;");
console.log("%cThis is a browser feature intended for developers. If someone told you to copy-paste something here to enable a feature or “hack” someone’s account, it is a scam and will give them access to your account.", "font: 1.5em sans-serif; color: grey;");

require('dotenv').config()
require('./helpers/switch')
require('./helpers/utils')
require('./helpers/clean')

global.app = remote.app
global.router = new Navigo(null, true, '#')
// global.mailer = require('./modules/mailer')
global.users = require('./modules/users')
global.sender = require('./modules/sender')

global.IMAPClient = require('./modules/IMAPClient')
global.Threader = require('./modules/Threader')
global.Utils = require('./modules/Utils')

global.WelcomePage = require('./modules/WelcomePage')

global.AccountManager = new require('./modules/AccountManager')()

const { setup } = require('./modules/setup')
const { welcome } = require('./modules/welcome')
const { mail } = require('./modules/mail')

router.on({
  '/setup': () => { timeFunc(setup) },
  '/welcome': () => { timeFunc(WelcomePage.load) },
  '/mail': () => { timeFunc(mail) }
}).resolve()

router.navigate('/setup')
