'use strict'
const electron = require('electron')
const createWindow = require('./app/helpers/window')
const app = electron.app

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')({ showDevTools: true })

// prevent window being garbage collected
let mainWindow
let windows = []

function onMainClosed () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
  mainWindow = null
}

function onOtherClosed (number) {
  console.log(`Someone closed window number ${number}`)
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!mainWindow) {
    openWindow('main')
  }
})

app.on('ready', () => {
  openWindow('main')
})

function openWindow (file) {
  if (file === 'main') {
    mainWindow = createWindow(file, {
      width: 600,
      height: 400,
      icon: 'build/128x128.png',
      frame: false
    }, false)

    mainWindow.loadURL(`file://${__dirname}/app/${file}.html`)
    mainWindow.on('closed', onMainClosed)
  } else {
    windows.push(createWindow(file, {
      width: 600,
      height: 400,
      icon: 'build/128x128.png',
      frame: false
    }, false))

    windows[windows.length - 1].loadURL(`file://${__dirname}/app/${file}.html`)
    windows[windows.length - 1].on('closed', ((i) => {
      return () => { onOtherClosed(i) }
    })(windows.length - 1))
  }
}

electron.ipcMain.on('open', (event, arg) => {
  openWindow(arg.file)
})

electron.ipcMain.on('send', (event, arg) => {
  console.log(arg)
  mainWindow.webContents.send('send', arg)
})
