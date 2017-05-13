function Threader () {}

/**
 * Removes extraneous information from a message array and passes this information to
 * Threader.generateReplyMap, which retrieves all threads from it.
 * @param  {array}  messages [An array of message objects (with envelopes)]
 * @return {array}           [An array of threads found within the messages array]
 */
Threader.applyThreads = (messages) => {
  let messageThreads = {}
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].envelope.messageId) {
      messageThreads[messages[i].uid] = {
        messageId: messages[i].envelope.messageId,
        inReplyTo: messages[i].envelope.inReplyTo || undefined
      }
    }
  }
  return Threader.generateReplyMap(messageThreads)
}

/**
 * Retrieves all threads from an array of customised messages objects (likely from
 * Threader.applyThreads)
 * @param  {array}  messages [An array of specialised message objects]
 * @return {array}           [An array of threads within that array of message objects]
 */
Threader.generateReplyMap = (messages) => {
  let ids = {}
  for (let [id, message] of Object.entries(messages)) {
    ids[message.messageId] = id
  }

  let children = {}
  for (let [id, message] of Object.entries(messages)) {
    let parentId = ids[message.inReplyTo]
    children[parentId] = children[parentId] || []
    children[parentId].push(id)
  }

  let result = {}
  for (let child of children[undefined]) {
    result[child] = Threader.findAllChildren(child, children)
  }
  return Threader.cleanObject(result)
}

/**
 * Find all children within an array
 * @param  {array}  root     [ID of element we're searching for]
 * @param  {object} children [An object of children objects]
 * @return {array}           [A result of found children]
 */
Threader.findAllChildren = (root, children) => {
  let result = children[root] || []
  for (let child of result) {
    result = result.concat(Threader.findAllChildren(child, children))
  }
  return result
}

/**
 * Clean an object of all null items
 * @param  {object} obj [Dirty object with null values]
 * @return {object}     [Clean object without]
 */
Threader.cleanObject = (obj) => {
  for (var propName in obj) {
    if (typeof obj[propName] === 'object' && obj[propName].length === 0) {
      delete obj[propName]
    }
  }
  return obj
}

module.exports = Threader