async function getWeather(city: string) {
    return `${city}今天天气晴朗，温度为25°C。`;
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
    }
]
export const systemFunc = {
    getWeather
}