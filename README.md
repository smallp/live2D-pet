# Desktop AI Assistant (Electron + Vue)

这是一个基于 Electron、Vue 3 和 Vite 开发的桌面应用，集成了大模型（LLM）、语音识别（STT）和语音合成（TTS）功能。  
之前想用 Live2d 实现一个数字人，但后面发现让数字人拟人难度很大，砍掉了。后面只会在 AI 上加功能，界面交互简略化。

## 功能特性

- **语音交互**：按下全局快捷键（F8）即可开始录音，松开结束录音并进行语音转文字（STT）。
- **智能回答**：集成 LLM 大模型接口，可实现智能对话。
- **语音播放**：集成 TTS 语音合成功能，支持 PCM 流式音频播放。
- **透明窗口**：支持桌面透明窗口显示，适合作为桌面宠物挂件。
- **全局热键**：使用 `uiohook-napi` 实现系统级全局热键监听（默认 F8）。

## 技术栈

- **Frontend**: Vue 3, Vite, TypeScript
- **Runtime**: Electron
- **Services**: OpenAI API 兼容接口 (用于 LLM, STT, TTS)
- **Native Hooks**: `uiohook-napi` (全局热键)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置文件

应用首次启动会在用户目录下创建配置文件 `~/.pet.settings.json`。你需要填入相应的 API 密钥和地址：

```json
{
  "tts": {
    "url": "您的 TTS API 地址",
    "key": "您的 API Key",
    "model": "tts-1",
    "voice": "alloy",
    "sampleRate": 24000
  },
  "stt": {
    "url": "您的 STT API 地址",
    "key": "您的 API Key",
    "model": "whisper-1"
  },
  "llm": {
    "url": "您的 LLM API 地址",
    "key": "您的 API Key",
    "model": "gpt-3.5-turbo"
  }
}
```

### 3. 开发模式运行

```bash
npm run dev
```

### 4. 构建应用

```bash
npm run build
```

## 快捷键说明

- **F8 (按住)**：开始录音。
- **F8 (松开)**：停止录音并触发后续流程（STT -> LLM -> TTS）。

## 许可证

MIT
