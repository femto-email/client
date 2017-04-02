
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