import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { EventEmitter } from 'node:events'
import { uIOhook } from 'uiohook-napi'
import { loadConfig, validateConfig, setupConfigIPC } from './config'
import { initWs, createTask } from './ws'

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

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    // frame: false,
    transparent: true,
    // alwaysOnTop: true,
    // fullscreenable: false,
    // resizable: false,
    webPreferences: {
      preload,
      webSecurity: false,
    },
  })
  // win.setIgnoreMouseEvents(true, { forward: true });
  // win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true);

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }
}

// Global hotkey listening
const F8_KEYCODE = 66
let isF8Pressed = false

uIOhook.on('keydown', (event) => {
  if (event.keycode === F8_KEYCODE && !isF8Pressed) {
    isF8Pressed = true
    win?.webContents.send('start-recording')
  }
})

uIOhook.on('keyup', (event) => {
  if (event.keycode === F8_KEYCODE && isF8Pressed) {
    isF8Pressed = false
    win?.webContents.send('stop-recording')
  }
})

app.whenReady().then(() => {
  const config = loadConfig()
  if (validateConfig(config)) {
    setupConfigIPC(config)
    initWs(wsEvents)

    ipcMain.handle('create-task', async (_, taskData) => {
      const taskId = createTask(taskData)
      if (!taskId) return null

      return new Promise((resolve) => {
        wsEvents.once(taskId, (result) => {
          resolve(result)
        })
      })
    })

    ipcMain.handle('write-file', async (_, { path: filePath, content }) => {
      if (!win) return { success: false, message: '窗口不存在' }

      // 强制将路径限制在用户根目录下
      let absolutePath: string
      if (filePath.startsWith('~/')) {
        absolutePath = path.join(os.homedir(), filePath.slice(2))
      } else {
        // 无论传入什么，都取其 basename 并拼接到用户家目录，或者简单处理
        // 根据要求：在前面添加 ~/，意味着我们要引导路径到用户家目录
        const relativePath = filePath.replace(/^([a-zA-Z]:)?(\\|\/)+/, '') // 移除开头的盘符或斜杠
        absolutePath = path.join(os.homedir(), relativePath)
      }

      const { response } = await dialog.showMessageBox(win, {
        type: 'question',
        buttons: ['确定', '取消'],
        defaultId: 0,
        title: '文件写入确认',
        message: `是否允许写入文件？\n路径: ${absolutePath}`,
        detail: '写入操作将覆盖原有文件内容（如果文件已存在）。'
      })

      if (response === 0) {
        try {
          const dir = path.dirname(absolutePath)
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
          }
          fs.writeFileSync(absolutePath, content, 'utf-8')
          return { success: true, message: '写入成功', path: absolutePath }
        } catch (error: any) {
          return { success: false, message: `写入失败: ${error.message}` }
        }
      } else {
        return { success: false, message: '用户取消了操作' }
      }
    })

    ipcMain.handle('read-file', async (_, { path: filePath }) => {
      // 强制将路径限制在用户根目录下
      let absolutePath: string
      if (filePath.startsWith('~/')) {
        absolutePath = path.join(os.homedir(), filePath.slice(2))
      } else {
        const relativePath = filePath.replace(/^([a-zA-Z]:)?(\\|\/)+/, '')
        absolutePath = path.join(os.homedir(), relativePath)
      }

      try {
        if (fs.existsSync(absolutePath)) {
          const content = fs.readFileSync(absolutePath, 'utf-8')
          return { success: true, content }
        } else {
          return { success: false, message: '文件不存在' }
        }
      } catch (error: any) {
        return { success: false, message: `读取失败: ${error.message}` }
      }
    })

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