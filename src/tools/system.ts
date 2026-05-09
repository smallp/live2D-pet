async function getWeather(param: { city: string }) {
    return `${param.city}今天天气晴朗，温度为25°C。`;
}

async function getCurrentTime() {
    return new Date().toLocaleString();
}

async function writeFile(param: { path: string, content: string }) {
    const result = await (window as any).ipcRenderer.invoke('write-file', param);
    if (!result.success) {
        throw new Error(result.message || '写入文件失败');
    }
    return result;
}

async function readFile(param: { path: string }) {
    const result = await (window as any).ipcRenderer.invoke('read-file', param);
    if (!result.success) {
        throw new Error(result.message || '读取文件失败');
    }
    return result.content;
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
    },
    {
        type: "function",
        function: {
            name: "writeFile",
            description: "写入文件到本地",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "文件名" },
                    content: { type: "string", description: "文件内容" },
                },
                required: ["path", "content"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "readFile",
            description: "从本地读取文件内容",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "文件名" },
                },
                required: ["path"],
            },
        },
    }
]
export const systemFunc = {
    getWeather,
    getCurrentTime,
    writeFile,
    readFile
}