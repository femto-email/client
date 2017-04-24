let services = require('./nodemailer_listed_services')
let fs = require('fs')
let formatted = {}

for (let service in services) {
  if (typeof services[service].domains !== 'undefined') {
    for (let i = 0; i < services[service].domains.length; i++) {
      formatted[services[service].domains[i]] = {
        host: services[service].host,
        port: services[service].port,
        secure: services[service].secure,
        name: service
      }
    }
  }
}

fs.writeFile('./domain_details.json', JSON.stringify(formatted, null, 4))