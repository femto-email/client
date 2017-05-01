let services = require('./domain_template.json')
let fs = require('fs')
let formatted = {}

for (let i in services) {
  if (typeof services[i].domains != 'undefined') {
    console.log(services[i].domains)
    console.log(services[i].domains.length)
    console.log(i)
    let domains = services[i].domains
    let number = domains.length
    for (let j = 0; j < number; j++) {
      formatted[domains[j]] = services[i]
      formatted[domains[j]].domains = undefined
    }
  }
}

fs.writeFile('./email_format_general.json', JSON.stringify(formatted, null, 2))