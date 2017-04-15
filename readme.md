# Maily

> A cross-platform mail-client with the intent to be fast, reliable and easy to use.

## Production

We're very sorry, at the moment no production builds are available!  Please stand-by as we get our monkeys typing as fast as we can.

## Dev

Looking to get started?  We've kept things as simple as possible, right now there are only three commands required for this project.

```
$ npm install
```

### Run

```
$ npm start
```

### Build

```
$ npm run build
```

### Layout

The top-level folder mainly contains information relating to the project, as well as how specific tools can run/build the project.  Important files in here are:

 - `index.js`, which is the file run when one starts the application, it creates a new window and loads up our application.  
 - `package.json`, contains information about this project such as licensing and author information.  Also contains a list of all node modules required to run this project, which are installed when `npm i` is run.

The app folder contains the mail client, seperated into the HTML for layout, JavaScript modules for the logic and CSS for the styling.  

 - `main.html`, a page which is always loaded, it forms the basis of each of our pages.  Contains the script to load `app.js` and any styles we will need.
 - `welcome.html`, contains user onboarding information to get them setup with an account.
 - `mail.html`, contains the page design for the actual mail application.
 - `app.js`, the entry point for the JavaScript code.

There are also three folders, `css` contains all the styling for the project, as well as fonts.  `helpers` contains a series of commands that aim to make the rest of the project easier to use (one hopes there are very few reasons to edit files in here), whilst `modules` implements a lot of the functionality you see.  Within the modules folder, we have:

 - `setup.js`, when the project is first loaded this module is run to setup basic information required globally and deciding which state the user is currently in.  Once it gains this information, it routes the user to the correct location.
 - `welcome.js`, handles all the logic for the user onboarding.
 - `mail.js`, handles all the logic for the mail application itself.
 - `mailer.js`, a module which attempts to abstract the `IMAP` plugin to our needs, handles the base authentication with the mail server as well as retrieving messages.

Electron is built for single page applications, thus we use our own router (`navigo` in `app.js`) and insert the HTML of each page ourselves.  To attempt to seperate the CSS into logical files, we also enable/disable them on page change.  Most of this has been completed before hand so we can normally ignore it.  When creating a new page however, one should run the following command:

```javascript
page(<pageName>, ['basic', <cssFiles...>])
```

It will handle switching the HTML, as well as enabling/disabling required CSS files.  When this new page is loaded, for development purposes it is also useful to add in:

```javascript
if (!testLoaded(<pageName>)) return
```

Which makes sure this page isn't being called from a `reload` operation, but instead is being routed from the router.  If the page has not loaded, it is likely the setup function has not run yet and variables you may normally have access to are no longer defined.

## License

MIT © [Codefined](http://github.com/popey456963/maily)
