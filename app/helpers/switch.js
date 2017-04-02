const $ = require('jquery')

/**
 * This function enables an array of CSS files, whilst disabling
 * the rest.
 * 
 * @param  {array} titles
 * @return {undefined}
 */
global.style = (titles) => {
  for (let i = 0; i < document.styleSheets.length; i++) {
    let shouldEnable = titles.includes(document.styleSheets[i].title) || document.styleSheets[i].title.includes('all-')

    document.styleSheets[i].disabled = !shouldEnable

    if (shouldEnable) {
      titles.splice(titles.indexOf(document.styleSheets[i].title), 1)
    }
  }
  if (titles.length) {
    console.error(`Warning, ${titles} was/were not found within the list of stylesheets.`)
    console.log(document.styleSheets)
  }
}

/**
 * Page handles all our application state switching by enabling
 * and disabling CSS, and loading the HTML into the body of the
 * application
 * 
 * @param  {string} page
 * @param  {array} css
 * @return {undefined}
 */
global.page = (page, css) => {
  logger.debug(`Switching page to ${page}`)
  $('body').html(appDir.read(`./app/${page}.html`))
  style(css)
}

