import { app, dialog, ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { AppConfig } from "../../type.ts";

const CONFIG_PATH = path.join(os.homedir(), '.pet.settings.json')

const DEFAULT_CONFIG: AppConfig = {
  tts: { url: '', key: '', model: '', voice: '', sampleRate: 24000 },
  stt: { url: '', key: '', model: '' },
  llm: { url: '', key: '', model: '' }
}

export function loadConfig(): AppConfig {
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
      `~/.pet.settings.json 中的以下配置缺少 url:\n${missingUrls.join(', ')}\n\n请完善配置后重新启动。`
    )
    app.quit()
    return false
  }
  return true
}

export function setupConfigIPC(config: AppConfig) {
  ipcMain.handle('get-config', () => config)
}
