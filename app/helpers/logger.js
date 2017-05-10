var chalk = require('chalk')
var stacktrace = require('stack-trace')
var path = require('path')

var defaults = {
  'logLevel': 5,
  'status': true,
  'locLength': 12,
  'dateFormat': '[hh:mm:ss]',
  'client': typeof window !== 'undefined',
  'detectFunctions': true,
  'customName': false,
  'colour': {
    error: chalk.red,      // (0)
    warning: chalk.yellow, // (1)
    success: chalk.green,  // (2)
    log: chalk.gray,       // (3)
    info: chalk.gray,      // (4)
    debug: chalk.gray,     // (5)
    date: chalk.cyan,
    file: chalk.yellow,
    function: chalk.green
  },
  'clientColour': {
    error: 'color: Red; font-weight: bold;',
    warning: 'color: Salmon; font-weight: bold;',
    success: 'color: Green',
    log: 'color: Black',
    info: 'color: DodgerBlue',
    debug: 'color: DarkGray'
  }
}

function Logger (options) {
  options = options || {}

  for (var option in defaults) {
    this[option] = options[option] || defaults[option]
  }

  if (options.customName) this.customName = this.pad(options.customName)
}

Logger.prototype.pad = function (name) {
  while (name.length < this.locLength) name += ' '
  return name
}

Logger.prototype.date = function () {
  var date = new Date()
  var parts = {
    hh: String('00' + date.getHours()).slice(-2),
    mm: String('00' + date.getMinutes()).slice(-2),
    ss: String('00' + date.getSeconds()).slice(-2),
    dd: String('00' + date.getDate()).slice(-2),
    yyyy: String('0000' + date.getFullYear()).slice(-4),
    MM: String('00' + (date.getMonth() + 1)).slice(-2)
  }

  var keys = Object.keys(parts)
  var format = this.dateFormat

  for (var i = 0; i < keys.length; i++) {
    format = format.replace(keys[i], parts[keys[i]])
  }

  return format
}

Logger.prototype.capitalise = function (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

Logger.prototype.error = function () { if (this.logLevel >= 0) this.print(arguments, 'error') }
Logger.prototype.warning = function () { if (this.logLevel >= 1) this.print(arguments, 'warning') }
Logger.prototype.success = function () { if (this.logLevel >= 2) this.print(arguments, 'success') }
Logger.prototype.log = function () { if (this.logLevel >= 3) this.print(arguments, 'log') }
Logger.prototype.info = function () { if (this.logLevel >= 4) this.print(arguments, 'info') }
Logger.prototype.debug = function () { if (this.logLevel >= 5) this.print(arguments, 'debug') }

Logger.prototype.group = function (title) { console.group(title) }
Logger.prototype.groupEnd = function (title) { console.groupEnd(title) }
Logger.prototype.groupCollapsed = function (title) { console.groupCollapsed(title) }

Logger.prototype.print = function (args, level) {
  var date = this.date()

  args = Object.keys(args).map(function (key) {
    return args[key]
  })

  var message = []

  for (var i = 0; i < args.length; i++) {
    if (typeof args[i] === 'string' || typeof args[i] === 'number') {
      message.push(args[i])
    } else {
      message.push('\n' + JSON.stringify(args[i], null, 4))
    }
  }

  message = message.join(' ')
  if (message.charAt(0) === '\n') message = message.slice(1)

  var func, file

  if (this.customName) {
    file = this.customName
  } else {
    var stack = stacktrace.get()[2]
    if (stack.getFunctionName()) {
      func = this.pad(stack.getFunctionName() + '()')
      if (func.includes('global.')) func = this.pad(func.substring(7))
    } else if (stack.getFileName()) {
      file = this.pad(path.basename(stack.getFileName()))
    } else {
      func = this.pad('console()')
    }
  }

  var log = level === 'error' ? console.error : console.log
  if (this.client) {
    log(`%c${date} %c[${func || file}] %c${message}`, `color:blue;`, func ? `color:green` : `color:orange`, this.clientColour[level])
  } else {
    log(`${this.colour.date(date)} [${func ? this.colour.function(func) : this.colour.file(file)}] ${this.colour[level](message)}`)
  }
}

global.logger = new Logger()