function mail() {
  if (!testLoaded('mail')) return

  logger.log(`Loading mail window complete.`)
}

module.exports = { mail }