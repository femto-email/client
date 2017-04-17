/**
 * Grab all the values from a form and returns them as an object.
 * 
 * @param  {string} id
 * @return {object}
 */
global.getItemsFromForm = (id) => {
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

/**
 * HTML escapes a string.  More efficient than a naive replacement.
 *
 * @param  {string} string
 * @return {string}
 */
global.escapeHTML = (string) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }

  if (string) {
    return string.replace(/[&<>"']/g, function(m) { return map[m] })
  } else {
    return undefined
  }
}

/**
 * Time the runtime of a function, waits for a promise to end if it is a promise.
 *
 * @param {function} func
 * @return {undefined}
 */
global.timeFunc = async (func) => {
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
}