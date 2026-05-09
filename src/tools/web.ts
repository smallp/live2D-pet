async function openUrl(param: { url: string }) {
    const result = await (window as any).ipcRenderer.invoke('create-task', {
        task: 'featchUrl',
        data: param
    })
    return result
}

export const webDef = [
    {
        type: "function",
        function: {
            name: "openUrl",
            description: "打开网页并获取内容",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string" },
                },
                required: ["url"],
            },
        },
    },
]
export const webFunc = {
    openUrl,
}