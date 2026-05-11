import { ipcMain, dialog, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const logPath = path.join(os.homedir(), '.pet', 'log.log')

export function setupHandlers(win: BrowserWindow | null) {
  // 初始化时删除旧日志
  if (fs.existsSync(logPath)) {
    try {
      fs.unlinkSync(logPath)
    } catch (err) {
      console.error('Failed to delete log file:', err)
    }
  }

  ipcMain.handle('log', async (_, content: string) => {
    try {
      fs.appendFileSync(logPath, content + (content.endsWith('\n') ? '' : '\n'), 'utf-8')
      return { success: true }
    } catch (error: any) {
      return { success: false, message: `写入日志失败: ${error.message}` }
    }
  })

  ipcMain.handle('write-file', async (_, { path: filePath, content }) => {
    if (!win) return { success: false, message: '窗口不存在' }

    // 强制将路径限制在用户根目录下
    let absolutePath: string
    if (filePath.startsWith('~/')) {
      absolutePath = path.join(os.homedir(), filePath.slice(2))
    } else {
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
}
