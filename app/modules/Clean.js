function Clean () {}

Clean.escape = function (string) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }

  if (string) {
    return string.replace(/[&<>"']/g, function (m) { return map[m] })
  } else {
    return undefined
  }
}

module.exports = Clean