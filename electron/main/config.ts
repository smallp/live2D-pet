import { app, dialog, ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import matter from 'gray-matter'
import type { AppConfig } from "../../type.ts";

const CONFIG_DIR = path.join(os.homedir(), '.pet')
export const skillDir = path.join(CONFIG_DIR, 'skills')
const CONFIG_PATH = path.join(CONFIG_DIR, 'settings.json')

const DEFAULT_CONFIG: AppConfig = {
  tts: { url: '', key: '', model: '', voice: '', sampleRate: 24000 },
  stt: { url: '', key: '', model: '' },
  llm: { url: '', key: '', model: '' }
}

export function loadConfig(): AppConfig {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(path.join(skillDir, 'zhihu.md'), `---
description: 获取热搜信息
---
访问 https://www.zhihu.com/hot 获取热搜信息，然后整理输出到文件 hot.md 中。需要带上标题、大概内容、链接信息。`)
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8')
    return DEFAULT_CONFIG
  }

  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8')
    return JSON.parse(data) as AppConfig
  } catch (error) {
    console.error('Failed to parse config file:', error)
    return DEFAULT_CONFIG
  }
}

export function validateConfig(config: AppConfig): boolean {
  const missingUrls: string[] = []
  if (!config.tts.url) missingUrls.push('tts')
  if (!config.stt.url) missingUrls.push('stt')
  if (!config.llm.url) missingUrls.push('llm')

  if (missingUrls.length > 0) {
    dialog.showErrorBox(
      '配置不完整',
      `~/.pet/settings.json 中的以下配置缺少 url:\n${missingUrls.join(', ')}\n\n请完善配置后重新启动。`
    )
    app.quit()
    return false
  }
  return true
}

export function setupConfigIPC(config: AppConfig) {
  ipcMain.handle('get-config', () => config)

  ipcMain.handle('get-skill', async () => {
    const skills: Record<string, { desc: string; content: string }> = {}
    if (!fs.existsSync(skillDir)) {
      return skills
    }

    const files = fs.readdirSync(skillDir)
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(skillDir, file)
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const { data, content } = matter(fileContent)

        skills[file.substring(0, file.length - 3)] = {
          desc: data.description || '',
          content: content.trim()
        }
      }
    }
    return skills
  })
}
