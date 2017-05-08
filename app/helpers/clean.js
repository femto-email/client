const sanitizeHTML = require('sanitize-html')

const htmlAllowed = {
  allowedTags: [ 'html', 'meta', 'body', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p',
    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'style',
    'a', 'ul', 'ol', 'span', 'center', ],
  allowedAttributes: {
    // We're tentatively allowing inline-css for now.
    '*': [ 'data-*', 'style', 'align', 'bgcolor', 'class', 'height', 'width', 'alt' ],
    a: [ 'href', 'name', 'target' ],
    // We don't currently allow img itself by default, but this
    // would make sense if we did
    img: [ 'src' ]
  },
  // Lots of these won't come up by default because we don't allow them
  selfClosing: [ 'img', 'br', 'hr', 'area', 'base', 'basefont', 'input', 'link', 'meta' ],
  // URL schemes we permit
  allowedSchemes: [ 'http', 'https', 'ftp', 'mailto' ],
  allowedSchemesByTag: {},
  allowProtocolRelative: true
}

global.cleanHTML = (dirty) => {
  return sanitizeHTML(dirty, htmlAllowed)
}
