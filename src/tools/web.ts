async function openUrl(url: string) {
    return ""
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
    }
]
export const webFunc = {
    openUrl
}