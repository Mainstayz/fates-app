<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    // import { Textarea } from "$lib/components/ui/textarea";
    import * as Tooltip from "$lib/components/ui/tooltip";
    import type { TimelineItem } from "$lib/types";
    import { Priority } from "$lib/types";
    import { appConfig } from "$src/app-config";
    import { LoaderCircle, PanelTop, Sparkles } from "lucide-svelte";
    import { onDestroy, onMount } from "svelte";
    import { t } from "svelte-i18n";
    import { v4 as uuidv4 } from "uuid";
    import DateRangePicker from "./date-range-picker.svelte";
    import PrioritySelector from "./priority-selector.svelte";
    import TagsAddButton from "./tags-add-button.svelte";
    import { generateTitle as generateTitleAI } from "$src/ai-title-optimization";

    let {
        item,
        callback,
    }: {
        item: TimelineItem;
        callback: (item: TimelineItem) => void;
    } = $props();

    let localItem = $state({ ...item }); // create local copy

    let aiEnabled = $state(false);
    let aiLoading = $state(false);

    let content = $state(item.content);
    let description = $state(item.description || "");
    let priority = $state<Priority>(item.priority || Priority.Medium);
    let startDate = $state(formatDateForInput(item.start));
    let endDate = $state(item.end ? formatDateForInput(item.end) : formatDateForInput(new Date()));

    let localSelectedTags = $state([...(item.tags || [])]);

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

    function handleTagsChange(newTags: string[]) {
        // 判断 newTags 是否与 localSelectedTags 相同，如果相同则不更新
        if (newTags.length === localSelectedTags.length && newTags.every((tag) => localSelectedTags.includes(tag))) {
            return;
        }
        localSelectedTags = newTags;
    }

    async function handleGenerateTitle() {
        if (!aiEnabled) {
            return;
        }
        aiLoading = true;
        try {
            const newTitle = await generateTitleAI(content);
            content = newTitle;
        } catch (error) {
            console.error("Error generating title:", error);
        } finally {
            aiLoading = false;
        }
    }

    onMount(() => {
        aiEnabled = appConfig.getAIConfig().enabled;
        return () => {
            const updatedItem = updateItem();
            callback(updatedItem);
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
            class="flex-1 bg-background border-0 shadow-none font-bold md:text-xl pl-[12px]"
            bind:value={content}
            placeholder={$t("app.taskDetail.taskTitlePlaceholder")}
            autofocus={false}
            tabindex={-1}
        />
        <Tooltip.Provider>
            <Tooltip.Root delayDuration={100} ignoreNonKeyboardFocus>
                <Tooltip.Trigger>
                    <Button variant="ghost" size="sm" disabled={!aiEnabled} onclick={handleGenerateTitle}>
                        {#if aiLoading}
                            <LoaderCircle class="animate-spin" />
                        {:else}
                            <Sparkles />
                        {/if}
                        <Label class="text-muted-foreground text-default">AI</Label>
                    </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                    <p>{$t("app.taskDetail.aiGenerateTitle")}</p>
                </Tooltip.Content>
            </Tooltip.Root>
        </Tooltip.Provider>
    </div>
    <div class="flex flex-row gap-2">
        <div class="w-[24px]"></div>
        <div class="flex flex-1 gap-8 pl-[12px]">
            <div class="w-[160px]">
                <div class="text-xs text-gray-500 mb-1">{$t("app.taskDetail.priorityLabel")}</div>
                <div class="h-[32px]">
                    <PrioritySelector
                        {priority}
                        variant="outline"
                        class="w-[160px]"
                        on:change={({ detail }) => {
                            console.log("priority changed:", detail.priority);
                            priority = detail.priority;
                        }}
                    />
                </div>
            </div>
            <div class="flex-1">
                <div class="text-xs text-gray-500 mb-1">{$t("app.taskDetail.tagsLabel")}</div>
                <div>
                    <TagsAddButton selectedTags={localSelectedTags} callback={handleTagsChange} />
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
                <Label class="text-xs text-gray-500 mb-1">{$t("app.taskDetail.dateLabel")}</Label>
                <DateRangePicker bind:startDate bind:endDate />
            </div>
        </div>
    </div>

    <!-- <div class="flex flex-row gap-2 pt-[8px]">
        <div class="pt-[2px] w-[24px]">
            <Text size={24} />
        </div>
        <div class="flex flex-col gap-1 flex-1 pl-[12px]">
            <Label for="description" class="text-lg text-gray-500">{$t("app.taskDetail.descriptionLabel")}</Label>
            <Textarea
                id="description"
                placeholder={$t("app.taskDetail.descriptionPlaceholder")}
                bind:value={description}
                class="bg-secondary w-full h-[100px] border-0 shadow-none resize-none"
            />
        </div>
    </div> -->
</div>

<style>
</style>
