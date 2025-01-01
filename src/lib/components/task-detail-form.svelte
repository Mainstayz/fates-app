<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Textarea } from "$lib/components/ui/textarea";
    import * as Tooltip from "$lib/components/ui/tooltip";
    import type { TimelineItem } from "$lib/types";
    import { Priority } from "$lib/types";
    import {
        SETTING_KEY_AI_API_KEY,
        SETTING_KEY_AI_BASE_URL,
        SETTING_KEY_AI_ENABLED,
        SETTING_KEY_AI_MODEL_ID,
    } from "$src/config";
    import { OpenAIClient } from "$src/features/openai";
    import { getKV } from "$src/store";
    import { LoaderCircle, PanelTop, Sparkles, Text } from "lucide-svelte";
    import { onDestroy, onMount } from "svelte";
    import { v4 as uuidv4 } from "uuid";
    import DateRangePicker from "./date-range-picker.svelte";
    import PrioritySelector from "./priority-selector.svelte";
    import TagsAddButton from "./tags-add-button.svelte";

    let {
        item,
        tagsList: initialTagsList,
        callback,
    }: {
        item: TimelineItem;
        tagsList: string[];
        callback: (item: TimelineItem, newTags: string[], selectedTags: string[]) => void;
    } = $props();

    let localItem = $state({ ...item }); // create local copy

    let aiEnabled = $state(false);
    let aiLoading = $state(false);

    let content = $state(item.content);
    let description = $state(item.description || "");
    let priority = $state<Priority>(item.priority || Priority.Medium);
    let startDate = $state(formatDateForInput(item.start));
    let endDate = $state(item.end ? formatDateForInput(item.end) : formatDateForInput(new Date()));

    let localTagsList: string[] = [...(initialTagsList || [])];
    let localSelectedTags: string[] = [...(item.tags || [])];

    function updateItem() {
        let className = "";
        let priorityNumber = 0;
        switch (priority) {
            case Priority.Low:
                className = "green";
                priorityNumber = Priority.Low;
                break;
            case Priority.Medium:
                className = "blue";
                priorityNumber = Priority.Medium;
                break;
            case Priority.High:
                className = "red";
                priorityNumber = Priority.High;
                break;
        }

        let newTags = localSelectedTags.filter((tag) => tag !== "");

        const updatedItem = {
            ...localItem,
            content,
            description,
            priority: priorityNumber,
            className,
            start: new Date(startDate),
            tags: newTags,
            end: endDate ? new Date(endDate) : undefined,
        };
        return updatedItem;
    }

    export function formatDateForInput(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    export function formatTimeForInput(date: Date): string {
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    }

    function handleTagsChange(tagsList: string[], selectedTags: string[]) {
        localTagsList = tagsList;
        localSelectedTags = selectedTags;
    }

    async function generateTitle() {
        aiLoading = true;
        let apikey = await getKV(SETTING_KEY_AI_API_KEY);
        let model = await getKV(SETTING_KEY_AI_MODEL_ID);
        let baseUrl = await getKV(SETTING_KEY_AI_BASE_URL);

        let client = new OpenAIClient({
            apiKey: apikey,
            baseURL: baseUrl,
            defaultModel: model,
        });
        let systemPrompt = `
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
        let conversationId = uuidv4();
        client.setSystemPrompt(conversationId, systemPrompt);
        try {
            const responseJson = await client.sendMessage(conversationId, content);
            let responseObject = JSON.parse(responseJson);
            let newTitle = responseObject.title;
            let newSummary = responseObject.summary;
            console.log(`new title: ${newTitle}, summary: ${newSummary}`);
            content = newTitle;
        } catch (error) {
            console.error("Error generating title:", error);
        } finally {
            aiLoading = false;
        }
    }

    onMount(() => {
        getKV(SETTING_KEY_AI_ENABLED).then((enabled) => {
            console.log("aiEnabled:", enabled);
            aiEnabled = enabled === "true";
        });
        return () => {
            let diffTags = localTagsList.filter((tag) => !initialTagsList.includes(tag));
            const updatedItem = updateItem();
            console.log("Before callback - updatedItem:", updatedItem);
            console.log("Before callback - localTagsList:", localTagsList, "diff:", diffTags);
            console.log("Before callback - selectedTags:", localSelectedTags);
            callback(updatedItem, diffTags, localSelectedTags);
        };
    });

    onDestroy(() => {});
</script>

<div class="flex flex-1 flex-col pr-[20px] gap-4">
    <div class="flex flex-row gap-2">
        <div class="w-[24px] pt-[6px]">
            <PanelTop size={24} />
        </div>
        <Input
            type="text"
            class="flex-1 bg-background border-0 shadow-none font-bold text-xl pl-[12px]"
            bind:value={content}
            placeholder="任务标题"
            autofocus={false}
            tabindex={-1}
        />
        {#if aiEnabled}
            <Tooltip.Provider>
                <Tooltip.Root delayDuration={100} ignoreNonKeyboardFocus>
                    <Tooltip.Trigger>
                        <Button variant="ghost" size="icon" onclick={generateTitle}>
                            {#if aiLoading}
                                <LoaderCircle class="animate-spin" />
                            {:else}
                                <Sparkles />
                            {/if}
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <p>AI 生成标题</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        {/if}
    </div>
    <div class="flex flex-row gap-2">
        <div class="w-[24px]"></div>
        <div class="flex flex-1 gap-8 pl-[12px]">
            <div class="w-[160px]">
                <div class="text-xs text-gray-500 mb-1">优先级</div>
                <div class="h-[32px]">
                    <PrioritySelector
                        {priority}
                        variant="outline"
                        class="w-[160px]"
                        on:change={({ detail }) => {
                            console.log("priority changed:", detail.priority);
                        }}
                    />
                </div>
            </div>
            <div class="flex-1">
                <div class="text-xs text-gray-500 mb-1">标签</div>
                <div>
                    <TagsAddButton
                        tagsList={localTagsList}
                        selectedTags={localSelectedTags}
                        onTagsChange={handleTagsChange}
                    />
                </div>
            </div>
        </div>
    </div>
    <div class="flex flex-row gap-2">
        <div class="w-[24px] pt-[6px]">
            <!-- <Timer size={24} /> -->
        </div>
        <div class="flex flex-1 pl-[12px]">
            <div>
                <Label class="text-xs text-gray-500 mb-1">日期</Label>
                <DateRangePicker bind:startDate bind:endDate />
            </div>
        </div>
    </div>

    <div class="flex flex-row gap-2 pt-[8px]">
        <div class="pt-[2px] w-[24px]">
            <Text size={24} />
        </div>
        <div class="flex flex-col gap-1 flex-1 pl-[12px]">
            <Label for="description" class="text-lg text-gray-500">描述</Label>
            <Textarea
                id="description"
                placeholder="添加详细描述..."
                bind:value={description}
                class="bg-secondary w-full h-[100px] border-0 shadow-none resize-none"
            />
        </div>
    </div>
</div>

<style>
</style>
