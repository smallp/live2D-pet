import { app, BrowserWindow, ipcMain, Tray, nativeImage } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { uIOhook } from 'uiohook-napi'
import { loadConfig, validateConfig, setupConfigIPC } from './config'
import { initWs, createTask } from './ws'
import { setupHandlers } from './handle'

const wsEvents = new EventEmitter()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST


if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}
let tray: Tray | null = null
let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    // frame: false,
    // resizable: false,
    webPreferences: {
      preload,
      webSecurity: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }
  win.minimize()
}
const green = nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC, 'green.png')).resize({ width: 32, height: 32 })
const red = nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC, 'red.png')).resize({ width: 32, height: 32 })
green.setTemplateImage(false)
red.setTemplateImage(false)
function createTray() {
  tray = new Tray(green)
  tray.setToolTip('AI Assistant')
}
function changeTrayColor(isRed: boolean) {
  tray?.setImage(isRed ? red : green)
}
// Global hotkey listening
const F8_KEYCODE = 66
let isF8Pressed = false

uIOhook.on('keydown', (event) => {
  if (event.keycode === F8_KEYCODE && !isF8Pressed) {
    isF8Pressed = true
    changeTrayColor(true)
    win?.webContents.send('start-recording')
  }
})

uIOhook.on('keyup', (event) => {
  if (event.keycode === F8_KEYCODE && isF8Pressed) {
    isF8Pressed = false
    changeTrayColor(false)
    win?.webContents.send('stop-recording')
  }
})

app.whenReady().then(() => {
  const config = loadConfig()
  if (validateConfig(config)) {
    setupConfigIPC(config)
    initWs(wsEvents)
    setupHandlers()

    ipcMain.handle('create-task', async (_, taskData) => {
      const taskId = createTask(taskData)
      if (!taskId) return null

      return new Promise((resolve) => {
        wsEvents.once(taskId, (result) => {
          resolve(result)
        })
      })
    })
    createTray()
    createWindow()
    uIOhook.start()
  }
})

app.on('window-all-closed', () => {
  win = null
  uIOhook.stop()
  app.quit()
})

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})
app.on('will-quit', () => {
  uIOhook.stop()
})