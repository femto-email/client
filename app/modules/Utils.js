const crypto = require('crypto')
const util = require('util')

function Utils () {}

/**
 * Simple object check.
 * 
 * @param item
 * @returns {boolean}
 */
Utils.isObject = function (item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Removes any circular elements from an object, replacing them with "Circular".
 *
 * @param  {object} object
 * @return {object}
 */
Utils.removeCircular = function (object) {
  var str = util.inspect(object, { depth: null })
  str = str
    .replace(/<Buffer[ \w\.]+>/ig, '"buffer"')
    .replace(/\[Function]/ig, 'function(){}')
    .replace(/\[Circular]/ig, '"Circular"')
    .replace(/\{ \[Function: ([\w]+)]/ig, '{ $1: function $1 () {},')
    .replace(/\[Function: ([\w]+)]/ig, 'function $1(){}')
    .replace(/(\w+): ([\w :]+GMT\+[\w \(\)]+),/ig, '$1: new Date("$2"),')
    .replace(/(\S+): ,/ig, '$1: null,')
  return JSON.parse(JSON.stringify((new Function('return ' + str + ';'))()))
}

Utils.md5 = (string) => {
	return crypto.createHash('md5').update(string).digest('hex')
}

/**
 * Time the runtime of a function, waits for a promise to end if it is a promise.
 *
 * @param {function} func
 * @return {undefined}
 */
Utils.time = async function (func) {
  let start = performance.now()
  let promise = func()
  if (promise instanceof Promise) {
    await promise
  }
  let end = performance.now()
  let run = end - start
  if (run < 1000) {
    logger.log(`The ${func.name}() function took ${parseFloat(run.toFixed(4))} milliseconds to run.`)
  } else {
    logger.warning(`Alert, running ${func.name}() took a long time, ${parseFloat(run.toFixed(4))} milliseconds.`)
  }
  if (promise instanceof Promise) {
    return await promise
  }
  return promise
}

/**
 * Grab all the values from a form and returns them as an object.
 *
 * @param  {string} id
 * @return {object}
 */
Utils.getItemsFromForm = (id) => {
  let form = document.getElementById('login-form')
  let values = {}

  for (let i = 0; i < form.elements.length; i++) {
    let e = form.elements[i]
    if (!['login'].includes(e.name)) {
      // If it's a checkbox, work out if it's checked, else get it's value.
      values[e.name] = e.type && e.type === 'checkbox' ? e.checked : e.value
    }
  }

  return values
}

module.exports = Utils