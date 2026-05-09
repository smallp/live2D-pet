async function getWeather(param: { city: string }) {
    return `${param.city}今天天气晴朗，温度为25°C。`;
}

async function getCurrentTime() {
    return new Date().toLocaleString();
}


export const systemDef = [
    {
        type: "function",
        function: {
            name: "getWeather",
            description: "获取指定城市天气",
            parameters: {
                type: "object",
                properties: {
                    city: { type: "string" },
                },
                required: ["city"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "getCurrentTime",
            description: "获取当前时间",
            parameters: {
                type: "object",
                properties: {},
            },
        },
    }
]
export const systemFunc = {
    getWeather,
    getCurrentTime
}