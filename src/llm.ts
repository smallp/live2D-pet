import { OpenAI } from "openai";
import { ServiceConfig } from "../type";
import { toolDefinitions, toolImplementations } from "./tools";

let llmClient: OpenAI | null = null;
let modelConfig: ServiceConfig | null = null;
let ttsCallback: ((text: string) => Promise<void>) | null = null;
let currentSkills: Record<string, { desc: string; content: string }> = {};
let cachedTools: any[] = [];

async function fetchSkills() {
    try {
        currentSkills = await (window as any).ipcRenderer.invoke('get-skill');
        updateCachedTools();
    } catch (error) {
        console.error("Failed to fetch skills:", error);
    }
}

function updateCachedTools() {
    const skillTools = Object.entries(currentSkills).map(([name, skill]) => ({
        type: "function",
        function: {
            name: `skill_${name}`,
            description: skill.desc || `执行技能: ${name}`,
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    }));

    const refreshTool = {
        type: "function",
        function: {
            name: "refresh_skills",
            description: "更新技能列表，当主人添加或修改了技能文件时，调用此工具刷新技能列表",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    };

    cachedTools = [...toolDefinitions, ...skillTools, refreshTool];
}

export async function init(config: ServiceConfig, tts: (text: string) => Promise<void>) {
    llmClient = new OpenAI({
        dangerouslyAllowBrowser: true,
        apiKey: config.key,
        baseURL: config.url,
    });
    modelConfig = config;
    ttsCallback = tts;
    await fetchSkills();
}

export async function chat(text: string) {
    if (!llmClient || !modelConfig) {
        console.error("LLM not initialized");
        return;
    }

    console.log(text)
    const messages: any[] = [
        { role: "system", content: "你是一个可爱的AI语音宠物，叫小七，你会称呼用户为‘主人’。用户是语音输入，可能会有错误，你需要尝试理解用户的意图并修正输入的内容，比如用户说“你号“实际上是在说“你好“。你的回复需要简洁，不能有表情、特殊符号，回复内容需要适合用TTS读出来。" },
        { role: "user", content: text }
    ];

    try {
        let response = await llmClient.chat.completions.create({
            model: modelConfig.model,
            messages: messages,
            tools: cachedTools as any,
        });

        let responseMessage = response.choices[0].message;

        // Handle tool calls
        while (responseMessage.tool_calls) {
            messages.push(responseMessage);

            for (const toolCall of responseMessage.tool_calls) {
                if (toolCall.type !== 'function') continue;
                const functionName = toolCall.function.name;

                try {
                    let functionResponse;
                    if (functionName === 'refresh_skills') {
                        await fetchSkills();
                        functionResponse = { success: true, message: "技能列表已更新" };
                    } else if (functionName.startsWith('skill_')) {
                        // 找到对应的 skill 内容并作为回复返回给 LLM，让 LLM 根据内容行动
                        const skillName = functionName.replace('skill_', '');
                        if (currentSkills[skillName]) {
                            functionResponse = {
                                instruction: currentSkills[skillName].content,
                                message: "这是该技能的操作说明，请根据此说明继续为主人提供服务"
                            };
                        } else {
                            throw new Error(`未找到工具实现: ${functionName}`);
                        }
                    } else {
                        const functionToCall = toolImplementations[functionName];
                        if (!functionToCall) {
                            throw new Error(`未找到工具实现: ${functionName}`);
                        }
                        const functionArgs = JSON.parse(toolCall.function.arguments);
                        console.log(`Calling tool: ${functionName}`, functionArgs);
                        functionResponse = await functionToCall(functionArgs);
                    }
                    console.log(`工具调用完成: ${functionName}`);

                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: JSON.stringify(functionResponse),
                    });
                } catch (error) {
                    messages.shift()
                    messages.push((error as Error).message);
                    await ttsCallback!(`主人，工具调用失败了呢，错误信息是 ${(error as Error).message}`);
                    await (window as any).ipcRenderer.invoke('log', JSON.stringify(messages));
                    return
                }
            }

            response = await llmClient.chat.completions.create({
                model: modelConfig.model,
                messages: messages,
                tools: cachedTools as any,
            });
            responseMessage = response.choices[0].message;
        }

        const finalContent = responseMessage.content;
        if (finalContent && ttsCallback) {
            console.log("LLM Response:", finalContent);
            await ttsCallback(finalContent);
        }
        messages.shift()
        messages.push(responseMessage.content);
        await (window as any).ipcRenderer.invoke('log', JSON.stringify(messages));

        return finalContent;
    } catch (error) {
        console.error("LLM chat failed:", error);
        await (window as any).ipcRenderer.invoke('log', JSON.stringify(messages));
    }
}
