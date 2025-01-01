<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Card } from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Textarea } from "$lib/components/ui/textarea";
    import { generateDescription, parseRepeatTimeString } from "$lib/utils/repeatTime";
    import type { Matter, RepeatTask, Todo } from "$src/store";
    import { getActiveRepeatTasks, getAllTodos, getKV, getMattersByRange, setKV } from "$src/store";
    import { onMount } from "svelte";
    import { OpenAIClient, type ChatMessage, type ChatRole } from "../features/openai";

    import {
        SETTING_KEY_AI_API_KEY,
        SETTING_KEY_AI_BASE_URL,
        SETTING_KEY_AI_MODEL_ID,
        SETTING_KEY_AI_SYSTEM_PROMPT,
    } from "$src/config";
    import dayjs from "dayjs";

    let baseUrl = $state("");
    let apiKey = $state("");
    let model = $state("");
    let systemPrompt = $state("");
    let userInput = $state("");

    let chatHistory: ChatMessage[] = $state([]);
    let client: OpenAIClient | null = $state(null);
    let conversationId = crypto.randomUUID();
    let isLoading = $state(false);
    let error: string | null = $state(null);

    // systemPrompt setKV
    $effect(() => {
        if (systemPrompt) {
            setKV(SETTING_KEY_AI_SYSTEM_PROMPT, systemPrompt);
        }
    });

    onMount(async () => {
        baseUrl = await getKV(SETTING_KEY_AI_BASE_URL);
        apiKey = await getKV(SETTING_KEY_AI_API_KEY);
        model = await getKV(SETTING_KEY_AI_MODEL_ID);
        systemPrompt = await getKV(SETTING_KEY_AI_SYSTEM_PROMPT);
        initializeChat();
    });

    function initializeChat() {
        try {
            client = new OpenAIClient({
                apiKey,
                baseURL: baseUrl || undefined,
                defaultModel: model,
            });
            error = null;
        } catch (e) {
            error = e instanceof Error ? e.message : "初始化失败";
            client = null;
        }
    }

    async function setSystemPrompt() {
        if (!client) {
            error = "请先初始化客户端";
            return;
        }
        try {
            await client.setSystemPrompt(conversationId, systemPrompt);
            error = null;
            // 重新加载聊天历史
            loadChatHistory();
        } catch (e) {
            error = e instanceof Error ? e.message : "设置系统提示词失败";
        }
    }

    async function clearHistory() {
        if (!client) {
            error = "请先初始化客户端";
            return;
        }
        try {
            await client.clearConversation(conversationId);
            chatHistory = [];
            error = null;
        } catch (e) {
            error = e instanceof Error ? e.message : "清除历史失败";
        }
    }

    async function loadChatHistory() {
        if (!client) {
            error = "请先初始化客户端";
            return;
        }
        try {
            chatHistory = await client.getConversationHistory(conversationId);
            error = null;
        } catch (e) {
            error = e instanceof Error ? e.message : "加载聊天历史失败";
        }
    }

    async function loadHistoryTasks() {
        let txtResult = "";
        const start = dayjs().subtract(7, "day").startOf("day").toISOString();
        const end = dayjs().endOf("day").toISOString();
        let list = await getMattersByRange(start, end);
        if (list.length > 0) {
            txtResult += "以下是最近 7 天的任务:\n";
            txtResult += "```csv\n";
            txtResult += ["开始时间", "结束时间", "标题", "标签"].join(" | ") + "\n";
            list.forEach((item: Matter) => {
                txtResult += `${new Date(item.start_time).toLocaleString()} | ${new Date(item.end_time).toLocaleString()} | ${item.title} | ${item.tags ?? ""}\n`;
            });
            txtResult += "```\n";
        }
        let todoList = await getAllTodos();
        todoList = todoList.filter((item: Todo) => item.status === "todo");
        if (todoList.length > 0) {
            txtResult += "以下是所有待办事项:\n";
            txtResult += "```csv\n";
            txtResult += ["标题"].join(" | ") + "\n";
            todoList.forEach((item: Todo) => {
                txtResult += `${item.title}\n`;
            });
            txtResult += "```\n";
        }

        let repeatTask = await getActiveRepeatTasks();
        if (repeatTask.length > 0) {
            txtResult += "以下是所有重复任务:\n";
            txtResult += "```csv\n";
            txtResult += ["标题", "标签", "重复时间"].join(" | ") + "\n";
            repeatTask.forEach((item: RepeatTask) => {
                const { weekdaysBits, startTime, endTime } = parseRepeatTimeString(item.repeat_time);
                const description = generateDescription(weekdaysBits);
                const fixedDescription = description.split("|").join(",");
                txtResult += `${item.title} | ${item.tags} | ${fixedDescription},${startTime}-${endTime}\n`;
            });
            txtResult += "```\n";
        }
        console.log(txtResult);
    }

    async function sendMessage() {
        if (!userInput.trim() || !client) {
            error = !client ? "请先初始化客户端" : null;
            return;
        }

        isLoading = true;
        error = null;
        const currentInput = userInput;
        userInput = "";

        try {
            const userMessage: ChatMessage = {
                id: `${conversationId}-user-${Date.now()}`,
                conversationId,
                role: "user" as ChatRole,
                content: currentInput,
                createTime: Date.now(),
                updateTime: Date.now(),
                status: "completed",
            };
            chatHistory = [...chatHistory, userMessage];
            await client.sendMessage(conversationId, currentInput, {
                model,
                stream: true,
                streamCallbacks: {
                    onMessage: (content) => {
                        // 更新最新的助手消息
                        const lastMessage = chatHistory[chatHistory.length - 1];
                        if (lastMessage && lastMessage.role === "assistant") {
                            lastMessage.content += content;
                            chatHistory = [...chatHistory];
                        } else {
                            const assistantMessage: ChatMessage = {
                                id: `${conversationId}-assistant-${Date.now()}`,
                                conversationId,
                                role: "assistant" as ChatRole,
                                content,
                                createTime: Date.now(),
                                updateTime: Date.now(),
                                status: "completed",
                            };
                            chatHistory = [...chatHistory, assistantMessage];
                        }
                    },
                    onError: (err) => {
                        error = err.message;
                    },
                },
            });
        } catch (e) {
            error = e instanceof Error ? e.message : "发送消息失败";
        } finally {
            isLoading = false;
        }
    }

    function handleClick(fn: () => void) {
        return () => {
            fn();
        };
    }
</script>

<div class="w-full h-full">
    <Card class="m-4 p-6 space-y-6">
        <div class="space-y-4">
            <div class="grid grid-cols-3 gap-4">
                <Input type="text" class="bg-background" placeholder="Base URL" bind:value={baseUrl} />
                <Input type="password" class="bg-background" placeholder="API Key" bind:value={apiKey} />
                <Input type="text" class="bg-background" placeholder="Model" bind:value={model} />
            </div>
            <Button class="w-full" onclick={() => initializeChat()}>初始化</Button>
            {#if error}
                <div class="text-red-500 text-sm">{error}</div>
            {/if}
        </div>

        <div class="space-y-2">
            <Textarea class="bg-background" placeholder="System Prompt" bind:value={systemPrompt} rows={4} />
            <div class="flex gap-2">
                <Button variant="outline" onclick={() => setSystemPrompt()}>设置提示词</Button>
                <Button variant="outline" onclick={() => clearHistory()}>清除聊天历史</Button>
                <Button variant="outline" onclick={() => loadHistoryTasks()}>读取历史任务</Button>
            </div>
        </div>
        <div class="flex-1 overflow-y-auto space-y-4 max-h-[calc(100vh-524px)]">
            {#each chatHistory as message}
                <div
                    class="p-4 rounded-lg {message.role === 'assistant'
                        ? 'bg-primary/10'
                        : 'bg-secondary/10'} select-text"
                >
                    <div class="text-sm text-muted-foreground mb-1">
                        {message.role === "assistant" ? "助手" : message.role === "system" ? "系统" : "用户"}
                    </div>
                    <div class="whitespace-pre-wrap select-text">{message.content}</div>
                </div>
            {/each}
        </div>

        <div class="space-y-2">
            <Textarea
                class="bg-background"
                placeholder="输入消息..."
                bind:value={userInput}
                rows={4}
                disabled={isLoading}
            />
            <Button class="w-full" onclick={() => sendMessage()} disabled={isLoading || !client}>
                {isLoading ? "发送中..." : "发送"}
            </Button>
        </div>
    </Card>
</div>
