'use strict'
const electron = require('electron')
const createWindow = require('./app/helpers/window')
const app = electron.app

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')({ showDevTools: true })

// prevent window being garbage collected
let mainWindow

function onClosed() {
  // dereference the window
  // for multiple windows store them in an array
  mainWindow = null
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow()
  }
})

app.on('ready', () => {
  mainWindow = createWindow('main', {
    width: 600,
    height: 400,
    icon: 'build/128x128.png',
    frame: false
  })

  mainWindow.loadURL(`file://${__dirname}/app/main.html`)
  mainWindow.on('closed', onClosed)
  mainWindow.webContents.openDevTools()
})