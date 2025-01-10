import { OpenAIClient } from "./openai";
import { appConfig } from "./app-config";
import { v4 as uuidv4 } from "uuid";

export interface TitleOptimizationResult {
    original_title: string;
    title: string;
    summary: string;
}

export async function generateTitle(content: string): Promise<string> {
    const aiConfig = appConfig.getAIConfig();
    if (!aiConfig.enabled) {
        return content;
    }

    const client = new OpenAIClient({
        apiKey: aiConfig.apiKey,
        baseURL: aiConfig.baseUrl,
        defaultModel: aiConfig.modelId,
    });

    const systemPrompt = `
您是一位任务标题优化专家，擅长将模糊的任务描述转化为更具体、精炼的方式命名，以便快速回忆起任务的具体内容。您需要：

1. 分析任务标题
2. 根据关键信息和行动点，构建精炼的任务标题。
3. 检查任务标题是否简洁明了，能否让人迅速回忆起任务的具体内容。

注意：任务标题应简洁、明确，能够准确反映任务的核心内容，同时易于理解和记忆。

请按以下格式输出优化建议：

{
  "original_title": "原始标题",
  "title": "优化后的标题",
  "summary": "优化说明"
}

示例输出：

{
  "original_title": "阅读",
  "title": "阅读《人类简史》第 1-2 章",
  "summary": "明确了阅读材料、范围"
}
    `;

    const conversationId = uuidv4();
    client.setSystemPrompt(conversationId, systemPrompt);

    try {
        const responseJson = await client.sendMessage(conversationId, content);
        const responseObject: TitleOptimizationResult = JSON.parse(responseJson);
        return responseObject.title;
    } catch (error) {
        console.error("Error generating title:", error);
        return content;
    }
}
