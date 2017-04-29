const data = require('./nodemailer_listed_services')
const fs = require('fs')

let ordered = {}

for (let i in data) {
  let object = {
    "aliases": data[i].aliases,
    "domains": data[i].domains,
    "smtp": {}
  }

  let host = {
    "host": data[i].host,
    "port": data[i].port
  }

  if (data[i].secure) {
    object.smtp.ssl = host
  } else {
    object.smtp.unencrypted = host
  }

  ordered[i] = object
}

fs.writeFile('./domain_details_general_format.json', JSON.stringify(ordered, null, 2))