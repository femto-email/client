const moment = require('moment')

function isToday (momentDate) {
  return momentDate.isSame(moment().clone().startOf('day'), 'd')
}

function isYesterday (momentDate) {
  return momentDate.isSame(moment().clone().subtract(1, 'days').startOf('day'), 'd')
}

function isWithinAWeek (momentDate) {
  // return momentDate.isAfter(moment().clone().startOf('week'))
  return momentDate.isAfter(moment().clone().subtract(7, 'days').startOf('day'))
}

function isWithinAYear (momentDate) {
  return momentDate.isAfter(moment().clone().startOf('year'))
}

function alterDate (date) {
  let messageTime = moment(new Date(date).toISOString())
  if (isToday(messageTime)) return messageTime.format('hh:mmA')
  if (isYesterday(messageTime)) return 'Yesterday'
  if (isWithinAWeek(messageTime)) return messageTime.format('dddd')
  if (isWithinAYear(messageTime)) return messageTime.format('Do MMM')
  return messageTime.format('Do MMM YYYY')
}

module.exports = alterDate
