'use strict'
const electron = require('electron')
const createWindow = require('./app/helpers/window')
const app = electron.app

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')({ showDevTools: true })

// prevent window being garbage collected
let windows = []

function onClosed (number) {
  if (process.platform !== 'darwin' && number === 0) {
    windows.map((val) => { return null })
    app.quit()
  }
  windows[number] = null
  console.log(`Someone closed window number ${number}`)
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!windows[0]) {
    openWindow('main')
  }
})

app.on('ready', () => {
  openWindow('main')
  electron.globalShortcut.register('CmdOrCtrl+Shift+C', () => {
    openWindow('compose')
  })
})

function openWindow (file) {
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize
  let index = file === 'main' ? 0 : windows.length

  windows[index] = createWindow(file, {
    width, height,
    icon: 'build/128x128.png',
    minWidth: 320, 
    minHeight: 480,
    maximized: true,
    frame: false
  })
  windows[index].loadURL(`file://${__dirname}/app/${file}.html`)
  windows[index].on('closed', ((i) => {
    return () => { onClosed(i) }
  })(index))
}

electron.ipcMain.on('open', (event, arg) => {
  openWindow(arg.file)
})

electron.ipcMain.on('send', (event, arg) => {
  windows[0].webContents.send('send', arg)
})