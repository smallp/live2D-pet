import { OpenAI } from "openai";
import { TTSConfig } from "../type";

let audioCtx: AudioContext | null = null;
let pcmNode: AudioWorkletNode | null = null;
let ttsClient: OpenAI | null = null;
let modelConfig: TTSConfig | null = null;

export async function init(config: TTSConfig) {
    if (audioCtx) return;

    modelConfig = config;
    ttsClient = new OpenAI({
        dangerouslyAllowBrowser: true,
        apiKey: config.key,
        baseURL: config.url
    });

    audioCtx = new window.AudioContext({ sampleRate: config.sampleRate });

    await audioCtx.audioWorklet.addModule('/pcm-worker.js');

    pcmNode = new AudioWorkletNode(audioCtx, 'pcm-player');
    pcmNode.connect(audioCtx.destination);
}

export async function tts(text: string) {
    if (!ttsClient || !modelConfig || !pcmNode || !audioCtx) {
        console.error("TTS not initialized");
        return;
    }

    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
    console.log(`tts:${text}`);

    try {
        const response = await ttsClient.audio.speech.create({
            model: modelConfig.model,
            voice: modelConfig.voice as any,
            input: text,
            response_format: "pcm"
        });

        const reader = response.body?.getReader();
        if (!reader) return;

        let leftover: Uint8Array | null = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            let combinedValue = value;
            if (leftover) {
                combinedValue = new Uint8Array(leftover.length + value.length);
                combinedValue.set(leftover);
                combinedValue.set(value, leftover.length);
                leftover = null;
            }

            const remainder = combinedValue.length % 2;
            let validData = combinedValue;
            if (remainder !== 0) {
                validData = combinedValue.slice(0, -remainder);
                leftover = combinedValue.slice(-remainder);
            }

            if (validData.length === 0) continue;

            const int16Array = new Int16Array(validData.buffer, validData.byteOffset, validData.byteLength / 2);
            const float32Array = new Float32Array(int16Array.length);

            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768;
            }

            pcmNode.port.postMessage(float32Array);
        }
    } catch (error) {
        console.error('TTS failed:', error);
    }
}