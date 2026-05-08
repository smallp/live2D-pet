export interface ServiceConfig {
    url: string
    key: string
    model: string
}
export interface TTSConfig extends ServiceConfig {
    voice: string
    sampleRate: number
}
export interface AppConfig {
    tts: TTSConfig
    stt: ServiceConfig
    llm: ServiceConfig
}