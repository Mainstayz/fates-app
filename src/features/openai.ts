import OpenAI from "openai";

export interface OpenAIConfig {
    apiKey: string;
    baseURL?: string;
    defaultModel?: string;
    organization?: string;
    timeout?: number;
}

export interface ChatOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stream?: boolean;
}

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
    id: string; // 消息唯一标识符
    conversationId: string; // 所属对话的 ID
    content: string; // 消息内容
    role: ChatRole; // 消息角色
    createTime: number; // 消息创建时间
    updateTime: number; // 消息更新时间
    tokenCount?: number; // 消息的 token 数量（可选）
    status: "pending" | "completed" | "error"; // 消息状态
    error?: string; // 错误信息（如果有）
    metadata?: Record<string, any>; // 额外的元数据
}

export interface Conversation {
    id: string;
    messages: ChatMessage[];
    systemPrompt?: string;
    createTime: number;
    updateTime: number;
}

export interface StorageAdapter {
    saveConversation(conversation: Conversation): Promise<void>;
    getConversation(id: string): Promise<Conversation | null>;
    listConversations(): Promise<Conversation[]>;
    deleteConversation(id: string): Promise<void>;
    saveMessage(conversationId: string, message: ChatMessage): Promise<void>;
    getMessages(conversationId: string): Promise<ChatMessage[]>;
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

export class StorageError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "StorageError";
    }
}

export interface StreamCallbacks {
    onMessage?: (content: string) => void;
    onComplete?: (fullContent: string) => void;
    onError?: (error: Error) => void;
}

export class OpenAIClient {
    private client: OpenAI;
    private defaultModel: string;
    private storage?: StorageAdapter;
    private activeConversations: Map<string, Conversation> = new Map();
    private conversationLocks: Map<string, Promise<void>> = new Map();
    private closed: boolean = false;

    constructor(config: OpenAIConfig, storageAdapter?: StorageAdapter) {
        this.validateConfig(config);

        this.defaultModel = config.defaultModel || "gpt-3.5-turbo";
        this.storage = storageAdapter;

        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
            organization: config.organization,
            timeout: config.timeout || 30000,
            dangerouslyAllowBrowser: true
        });
    }

    private validateConfig(config: OpenAIConfig): void {
        if (!config.apiKey) {
            throw new ValidationError("API key is required");
        }
        if (config.timeout && config.timeout < 0) {
            throw new ValidationError("Timeout must be a positive number");
        }
    }

    private validateConversationId(id: string): void {
        if (!id || typeof id !== "string") {
            throw new ValidationError("Invalid conversation ID");
        }
    }

    private validateMessage(message: string): void {
        if (!message || typeof message !== "string") {
            throw new ValidationError("Invalid message content");
        }
    }
    private async acquireLock(conversationId: string): Promise<() => void> {
        while (this.conversationLocks.has(conversationId)) {
            try {
                await this.conversationLocks.get(conversationId);
            } catch (error) {
                // 如果等待过程中出错，我们需要���续尝试获取锁
                continue;
            }
        }

        let releaseLock: () => void;
        const lockPromise = new Promise<void>((resolve) => {
            releaseLock = () => {
                this.conversationLocks.delete(conversationId);
                resolve();
            };
        });

        this.conversationLocks.set(conversationId, lockPromise);
        return releaseLock!;
    }

    private async withLock<T>(conversationId: string, operation: () => Promise<T>): Promise<T> {
        const release = await this.acquireLock(conversationId);
        try {
            return await operation();
        } finally {
            release();
        }
    }

    private ensureNotClosed(): void {
        if (this.closed) {
            throw new Error("Client is closed");
        }
    }

    private async getOrCreateConversation(id: string): Promise<Conversation> {
        let conversation = this.activeConversations.get(id);

        if (!conversation && this.storage) {
            let newConversation = await this.storage.getConversation(id);
            if (newConversation) {
                conversation = newConversation;
            }
        }

        if (!conversation) {
            conversation = {
                id,
                messages: [],
                createTime: Date.now(),
                updateTime: Date.now(),
            };
        }

        // 确保系统消息与 systemPrompt 一致
        if (conversation.systemPrompt) {
            const systemMessage = conversation.messages.find((msg) => msg.role === "system");
            if (!systemMessage) {
                conversation.messages.unshift({
                    id: `${id}-system-${Date.now()}`,
                    conversationId: id,
                    role: "system",
                    content: conversation.systemPrompt,
                    createTime: Date.now(),
                    updateTime: Date.now(),
                    status: "completed",
                });
            } else if (systemMessage.content !== conversation.systemPrompt) {
                systemMessage.content = conversation.systemPrompt;
                systemMessage.updateTime = Date.now();
            }
        }

        this.activeConversations.set(id, conversation);
        return conversation;
    }

    private async updateConversation(conversationId: string, message: ChatMessage): Promise<void> {
        const conversation = await this.getOrCreateConversation(conversationId);

        conversation.messages.push(message);
        conversation.updateTime = Date.now();
        this.activeConversations.set(conversationId, conversation);

        if (this.storage) {
            await Promise.all([
                this.storage.saveConversation(conversation),
                this.storage.saveMessage(conversationId, message),
            ]).catch((error) => {
                throw new StorageError(`Failed to save conversation: ${error.message}`);
            });
        }
    }

    public async sendMessage(
        conversationId: string,
        message: string,
        options?: ChatOptions & { streamCallbacks?: StreamCallbacks }
    ): Promise<string> {
        this.ensureNotClosed();
        this.validateConversationId(conversationId);
        this.validateMessage(message);

        return this.withLock(conversationId, async () => {
            try {
                const conversation = await this.getOrCreateConversation(conversationId);
                const userMessage: ChatMessage = {
                    id: `${conversationId}-user-${Date.now()}`,
                    conversationId,
                    role: "user",
                    content: message,
                    createTime: Date.now(),
                    updateTime: Date.now(),
                    status: "completed",
                };
                await this.updateConversation(conversationId, userMessage);

                if (options?.stream && options?.streamCallbacks) {
                    const stream = await this.client.chat.completions.create({
                        messages: conversation.messages,
                        model: options?.model || this.defaultModel,
                        temperature: options?.temperature ?? 0.7,
                        max_tokens: options?.maxTokens,
                        top_p: options?.topP,
                        frequency_penalty: options?.frequencyPenalty,
                        presence_penalty: options?.presencePenalty,
                        stream: true,
                    });

                    let fullContent = "";
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || "";
                        fullContent += content;
                        options.streamCallbacks.onMessage?.(content);
                    }

                    const assistantMessage: ChatMessage = {
                        id: `${conversationId}-assistant-${Date.now()}`,
                        conversationId,
                        role: "assistant",
                        content: fullContent,
                        createTime: Date.now(),
                        updateTime: Date.now(),
                        status: "completed",
                        metadata: {
                            model: options?.model || this.defaultModel,
                            temperature: options?.temperature ?? 0.7,
                        },
                    };
                    await this.updateConversation(conversationId, assistantMessage);
                    options.streamCallbacks.onComplete?.(fullContent);
                    return fullContent;
                } else {
                    const completion = await this.client.chat.completions.create({
                        messages: conversation.messages,
                        model: options?.model || this.defaultModel,
                        temperature: options?.temperature ?? 0.7,
                        max_tokens: options?.maxTokens,
                        top_p: options?.topP,
                        frequency_penalty: options?.frequencyPenalty,
                        presence_penalty: options?.presencePenalty,
                        stream: false,
                    });
                    if (!("choices" in completion)) {
                        throw new Error("Unexpected response format from OpenAI API");
                    }

                    if (!completion.choices || completion.choices.length === 0) {
                        throw new Error("No choices returned from OpenAI API");
                    }

                    const assistantMessage: ChatMessage = {
                        id: `${conversationId}-assistant-${Date.now()}`,
                        conversationId,
                        role: "assistant",
                        content: completion.choices[0]?.message?.content || "",
                        createTime: Date.now(),
                        updateTime: Date.now(),
                        status: "completed",
                        metadata: {
                            model: options?.model || this.defaultModel,
                            temperature: options?.temperature ?? 0.7,
                        },
                    };
                    await this.updateConversation(conversationId, assistantMessage);
                    return assistantMessage.content;
                }
            } catch (error) {
                if (options?.stream && options?.streamCallbacks?.onError) {
                    options.streamCallbacks.onError(error instanceof Error ? error : new Error(String(error)));
                }
                throw error;
            }
        });
    }

    public async setSystemPrompt(conversationId: string, prompt: string): Promise<void> {
        this.ensureNotClosed();
        this.validateConversationId(conversationId);
        this.validateMessage(prompt);

        return this.withLock(conversationId, async () => {
            const systemMessage: ChatMessage = {
                id: `${conversationId}-system-${Date.now()}`,
                conversationId,
                role: "system",
                content: prompt,
                createTime: Date.now(),
                updateTime: Date.now(),
                status: "completed",
            };
            const conversation = await this.getOrCreateConversation(conversationId);

            // 移除现有的系统消息
            conversation.messages = conversation.messages.filter((msg) => msg.role !== "system");
            // 添加新的系统消息到开头
            conversation.messages.unshift(systemMessage);
            conversation.systemPrompt = prompt;
            conversation.updateTime = Date.now();

            this.activeConversations.set(conversationId, conversation);

            if (this.storage) {
                try {
                    await this.storage.saveConversation(conversation);
                } catch (error) {
                    throw new StorageError(
                        `Failed to save system prompt: ${error instanceof Error ? error.message : "Unknown error"}`
                    );
                }
            }
        });
    }

    public async getConversationHistory(conversationId: string): Promise<ChatMessage[]> {
        this.ensureNotClosed();
        this.validateConversationId(conversationId);

        return this.withLock(conversationId, async () => {
            const conversation = await this.getOrCreateConversation(conversationId);
            return [...conversation.messages];
        });
    }

    public async clearConversation(conversationId: string): Promise<void> {
        this.ensureNotClosed();
        this.validateConversationId(conversationId);

        return this.withLock(conversationId, async () => {
            const conversation = await this.getOrCreateConversation(conversationId);
            const systemPrompt = conversation.systemPrompt;

            conversation.messages = systemPrompt
                ? [
                      {
                          id: `${conversationId}-system-${Date.now()}`,
                          conversationId,
                          role: "system",
                          content: systemPrompt,
                          createTime: Date.now(),
                          updateTime: Date.now(),
                          status: "completed",
                      },
                  ]
                : [];
            conversation.updateTime = Date.now();

            this.activeConversations.set(conversationId, conversation);

            if (this.storage) {
                try {
                    await this.storage.saveConversation(conversation);
                } catch (error) {
                    throw new StorageError(
                        `Failed to clear conversation: ${error instanceof Error ? error.message : "Unknown error"}`
                    );
                }
            }
        });
    }

    public async listConversations(): Promise<Conversation[]> {
        this.ensureNotClosed();

        if (this.storage) {
            try {
                return await this.storage.listConversations();
            } catch (error) {
                throw new StorageError(
                    `Failed to list conversations: ${error instanceof Error ? error.message : "Unknown error"}`
                );
            }
        }
        return Array.from(this.activeConversations.values());
    }

    public async deleteConversation(conversationId: string): Promise<void> {
        this.ensureNotClosed();
        this.validateConversationId(conversationId);

        return this.withLock(conversationId, async () => {
            this.activeConversations.delete(conversationId);
            if (this.storage) {
                try {
                    await this.storage.deleteConversation(conversationId);
                } catch (error) {
                    throw new StorageError(
                        `Failed to delete conversation: ${error instanceof Error ? error.message : "Unknown error"}`
                    );
                }
            }
        });
    }

    public async close(): Promise<void> {
        if (this.closed) {
            return;
        }

        this.closed = true;

        // 等待所有锁释放
        const locks = Array.from(this.conversationLocks.values());
        await Promise.all(locks);

        // 保存所有活跃对话
        if (this.storage) {
            try {
                const savePromises = Array.from(this.activeConversations.values()).map((conversation) =>
                    this.storage!.saveConversation(conversation)
                );
                await Promise.all(savePromises);
            } catch (error) {
                throw new StorageError(
                    `Failed to save conversations during shutdown: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`
                );
            }
        }

        // 清理资源
        this.activeConversations.clear();
        this.conversationLocks.clear();
    }
}
