export interface ServiceConfig {
    url: string
    key: string
    model: string
}

export interface AppConfig {
    tts: ServiceConfig
    stt: ServiceConfig
    llm: ServiceConfig
}