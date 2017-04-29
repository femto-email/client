let services = require('./csv_to_json_imap_smtp')
let fs = require('fs')
let formatted = {}
let name = ""


for (let i = 0; i < services.length; i++) {
  if (['IMAP Server (Incoming Messages)', '', 'SMTP Server (Outgoing Messages)'].includes(services[i].FIELD1)) {
    // it's a data field...
    let protocol = ''
    if (services[i].FIELD1 == 'IMAP Server (Incoming Messages)') protocol = 'imap'
    if (services[i].FIELD1 == 'SMTP Server (Outgoing Messages)') protocol = 'smtp'
    formatted[name][protocol] = {}
    let authentication = ""
    if (services[i].FIELD3 == 'SSL') authentication = "ssl"
    if (services[i].FIELD3 == 'StartTLS') authentication = "start-tls"
    if (services[i].FIELD3 == '') authentication = "unencrypted"
    formatted[name][protocol][authentication] = {
      "host": services[i].FIELD2,
      "port": services[i].FIELD4
    }
  } else {
    name = services[i].FIELD1
    formatted[name] = {}
  }
}

fs.writeFile('./arc_smtp_imap.json', JSON.stringify(formatted, null, 2))