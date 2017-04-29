let services = require('./arc_smtp_pop3.json')
let fs = require('fs')
let formatted = {}
let name = ""


for (let i = 0; i < services.length; i++) {
  formatted[services[i].name] = { "pop3": {} }
  let authentication = services[i].authentication == 'SSL' ? 'ssl' : 'unencrypted'
  formatted[services[i].name]['pop3'][authentication] = {
    host: services[i].host,
    port: services[i].port
  }
}

fs.writeFile('./arc_smtp_pop3.json', JSON.stringify(formatted, null, 2))