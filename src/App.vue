<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { AppConfig } from "../type.ts";
import {OpenAI,Uploadable} from "openai";
import { init as initTTS, tts } from "./tts";

const mediaRecorder = ref<MediaRecorder | null>(null)
const audioChunks = ref<Blob[]>([])
const isRecording = ref(false)
let sttClient:OpenAI|null = null
let llmClient:OpenAI|null = null
const modelConfig=ref<AppConfig|null>(null)

onMounted(async () => {
  window.ipcRenderer.invoke('get-config').then((config: AppConfig) => {
    initTTS(config.tts);
    sttClient = new OpenAI({
      dangerouslyAllowBrowser: true,
      apiKey: config.stt.key,
      baseURL: config.stt.url
    })
    llmClient = new OpenAI({
      dangerouslyAllowBrowser: true,
      apiKey: config.llm.key,
      baseURL: config.llm.url,
    })
    modelConfig.value = config
  }).catch((error) => {
    console.error('Renderer: Failed to get config:', error)
  })
  try {
    var stream: MediaStream
    // Listen for start-recording from main process
    window.ipcRenderer.on('start-recording', async () => {
      isRecording.value = true
      console.log('Renderer: Starting recording...')
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunks.value = []
      mediaRecorder.value = new MediaRecorder(stream)

      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.value.push(event.data)
        }
      }

      mediaRecorder.value.onstop = async () => {
        const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' })
        const file = new File([audioBlob], "record.webm", { type: "audio/webm" });
        sttClient!.audio.transcriptions.create({
          file: file,
          model: modelConfig.value!.stt.model
        }).then((response) => {
          console.log('Renderer: Transcription API Result:', response.text)
        }).catch((uploadError) => {
          console.error('Renderer: Upload failed:', uploadError)
        })
      }

      mediaRecorder.value.start()
    })

    // Listen for stop-recording from main process
    window.ipcRenderer.on('stop-recording', () => {
      isRecording.value = false
      console.log('Renderer: Stopping recording...')
      if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
        mediaRecorder.value.stop()
        stream.getTracks().forEach(track => track.stop()) // 停止所有媒体轨道
      }
    })

  } catch (error) {
    console.error('Failed to access microphone:', error)
  }
})

async function handleMouseDown() {
  tts("你好，今天天气怎么样？");
}
</script>

<template>
  <div @mousedown="handleMouseDown" class="flex-center" :style="{ backgroundColor: isRecording ? 'red' : 'green', height: '100px', width: '100px' }">
  </div>
</template>

<style>
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
html, body {
  width: 100%;
  height: 100%;
  background: transparent !important; /* 覆盖所有默认背景 */
  overflow: hidden; /* 隐藏滚动条（避免滚动条背景） */
}
</style>
