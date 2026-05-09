import { OpenAI } from "openai";
import { ServiceConfig } from "../type";
import { toolDefinitions, toolImplementations } from "./tools";

let llmClient: OpenAI | null = null;
let modelConfig: ServiceConfig | null = null;
let ttsCallback: ((text: string) => Promise<void>) | null = null;

export function init(config: ServiceConfig, tts: (text: string) => Promise<void>) {
    llmClient = new OpenAI({
        dangerouslyAllowBrowser: true,
        apiKey: config.key,
        baseURL: config.url,
    });
    modelConfig = config;
    ttsCallback = tts;
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
            tools: toolDefinitions as any,
        });

        let responseMessage = response.choices[0].message;

        // Handle tool calls
        while (responseMessage.tool_calls) {
            messages.push(responseMessage);

            for (const toolCall of responseMessage.tool_calls) {
                if (toolCall.type !== 'function') continue;
                const functionName = toolCall.function.name;
                const functionToCall = toolImplementations[functionName];
                if (!functionToCall) {
                    console.error(`Tool implementation for ${functionName} not found`);
                    continue;
                }
                const functionArgs = JSON.parse(toolCall.function.arguments);

                try {
                    console.log(`Calling tool: ${functionName}`, functionArgs);
                    const functionResponse = await functionToCall(functionArgs);
                    console.log(`工具调用完成: ${functionName}`);

                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: JSON.stringify(functionResponse),
                    });
                } catch (error) {
                    await ttsCallback!(`主人，工具调用失败了呢，错误信息是 ${(error as Error).message}`);
                    return
                }
            }

            response = await llmClient.chat.completions.create({
                model: modelConfig.model,
                messages: messages,
                tools: toolDefinitions as any,
            });
            responseMessage = response.choices[0].message;
        }

        const finalContent = responseMessage.content;
        if (finalContent && ttsCallback) {
            console.log("LLM Response:", finalContent);
            await ttsCallback(finalContent);
        }

        return finalContent;
    } catch (error) {
        console.error("LLM chat failed:", error);
    }
}
