async function openUrl(param: any) {
    const result = await (window as any).ipcRenderer.invoke('create-task', {
        task: 'featchUrl',
        data: param
    })
    if (!result) throw new Error("请求网页失败，请检查环境是否正常哦！");
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
                    wait: { type: "number", description: "等待网页加载完成的时间，单位秒，默认为0" },
                },
                required: ["url"],
            },
        },
    },
]
export const webFunc = {
    openUrl,
}