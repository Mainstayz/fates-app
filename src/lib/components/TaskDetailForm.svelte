<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Button } from "$lib/components/ui/button";
    import * as Popover from "$lib/components/ui/popover";
    import { Textarea } from "$lib/components/ui/textarea";
    import { PanelTop, Plus, Circle, Leaf, Flame, Zap, Timer, Text } from "lucide-svelte";
    import TagsAddButton from "./TagsAddButton.svelte";
    import DateRangePicker from "./DateRangePicker.svelte";
    import { onMount } from "svelte";
    import type { TimelineItem } from "$lib/types";

    let {
        item = $bindable(),
        tagsList: initialTagsList,
        tagDiff,
    }: {
        item: TimelineItem;
        tagsList: string[];
        tagDiff: (newTags: string[], selectedTags: string[]) => void;
    } = $props();

    const Priority = {
        Low: -1,
        Medium: 0,
        High: 1,
    } as const;

    const PRIORITY_COLORS = [
        { value: Priority.Low, label: "低优先级", icon: Leaf },
        { value: Priority.Medium, label: "中优先级", icon: Zap },
        { value: Priority.High, label: "高优先级", icon: Flame },
    ] as const;

    let origianlTagsList: string[] = [];
    let origianlSelectedTags: string[] = [];

    // 将 tagsList 添加到 origianlTagsList
    for (let tag of initialTagsList) {
        origianlTagsList.push(tag);
    }

    let tagsList = $state(initialTagsList);
    // 使用 $state 绑定到 item 的属性
    let content = $state(item.content);
    let description = $state(item.description || "");
    let priority = $state<number>(item.priority || Priority.Medium);
    let startDate = $state(formatDateForInput(item.start));
    let endDate = $state(item.end ? formatDateForInput(item.end) : formatDateForInput(new Date()));
    let selectedTags = $state(item.tags || []);

    // 监听变化并更新 item
    $effect(() => {
        item.content = content;
        item.description = description;
        item.priority = priority;
        item.start = new Date(startDate);
        item.tags = selectedTags;
        if (endDate) {
            item.end = new Date(endDate);
        }
    });

    function getPriorityLabel(value: number) {
        return PRIORITY_COLORS.find((c) => c.value === value)?.label ?? "选择优先级";
    }

    // 格式化日期为 YYYY-MM-DD 格式
    export function formatDateForInput(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // 格式化时间为 HH:mm 格式
    export function formatTimeForInput(date: Date): string {
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    }

    onMount(() => {
        // 获取输入框元素
        const inputElement = document.querySelector('input[placeholder="任务标题"]');
        if (inputElement) {
            // 移除焦点
            (inputElement as HTMLElement).blur();
            // 防止自动获取焦点
            (inputElement as HTMLElement).setAttribute("tabindex", "-1");
        }
        if (selectedTags.length > 0) {
            let revTags = selectedTags.reverse();
            for (let tag of revTags) {
                if (!tagsList.includes(tag)) {
                    tagsList.unshift(tag);
                }
            }
        }
        return () => {
            let diffTags = selectedTags.filter((tag) => !origianlSelectedTags.includes(tag));
            let outputTags = [...selectedTags];
            tagDiff(diffTags, outputTags);
        };
    });
</script>

<div class="flex flex-1 flex-col pr-[20px] gap-4">
    <!-- 标题 -->
    <div class="flex flex-row gap-2">
        <div class="w-[24px] pt-[6px]">
            <PanelTop size={24} />
        </div>
        <!-- 关闭自动焦点 -->
        <Input
            type="text"
            class="flex-1 bg-background border-0 shadow-none font-bold text-xl pl-[12px]"
            bind:value={content}
            placeholder="任务标题"
            autofocus={false}
            tabindex={-1}
        />
    </div>
    <!-- Tags，以及 优先级 -->
    <div class="flex flex-row gap-2">
        <div class="w-[24px]"></div>
        <div class="flex flex-1 gap-8 pl-[12px]">
            <div class="w-[160px]">
                <div class="text-xs text-gray-500 mb-1">优先级</div>
                <div class="h-[32px]">
                    <Popover.Root>
                        <Popover.Trigger>
                            <Button variant="outline" class="w-[160px] h-[32px] justify-start shadow-none">
                                <div class="flex items-center gap-2">
                                    {#if priority !== undefined}
                                        {@const Icon = PRIORITY_COLORS.find((c) => c.value === priority)?.icon}
                                        <Icon
                                            class={`w-4 h-4 ${
                                                priority === Priority.High
                                                    ? "text-red-500"
                                                    : priority === Priority.Medium
                                                      ? "text-yellow-500"
                                                      : "text-green-500"
                                            }`}
                                        />
                                    {/if}
                                    {getPriorityLabel(priority)}
                                </div>
                            </Button>
                        </Popover.Trigger>
                        <Popover.Content class="w-[160px] p-0">
                            <div class="flex flex-col">
                                {#each PRIORITY_COLORS as priorityOption}
                                    <Button
                                        variant="ghost"
                                        class="w-full justify-start"
                                        onclick={() => (priority = priorityOption.value)}
                                    >
                                        {@const Icon = priorityOption.icon}
                                        <div class="flex items-center gap-2">
                                            <Icon
                                                class={`w-4 h-4 ${
                                                    priorityOption.value === Priority.High
                                                        ? "text-red-500"
                                                        : priorityOption.value === Priority.Medium
                                                          ? "text-yellow-500"
                                                          : "text-green-500"
                                                }`}
                                            />
                                            {priorityOption.label}
                                        </div>
                                    </Button>
                                {/each}
                            </div>
                        </Popover.Content>
                    </Popover.Root>
                </div>
            </div>
            <div class="flex-1">
                <div class="text-xs text-gray-500 mb-1">标签</div>
                <div>
                    <TagsAddButton
                        {tagsList}
                        {selectedTags}
                        onAddNewTag={(tags: string[]) => {
                            // 逆序遍历
                            let revTags = tags.reverse();
                            for (let tag of revTags) {
                                if (!tagsList.includes(tag)) {
                                    tagsList.unshift(tag);
                                }
                            }
                        }}
                        onUseTag={(tags: string[]) => {
                            // 逆序遍历
                            selectedTags = tags;
                        }}
                    />
                </div>
            </div>
        </div>
    </div>
    <!-- 时间 -->
    <div class="flex flex-row gap-2">
        <div class="w-[24px] pt-[6px]">
            <!-- <Timer size={24} /> -->
        </div>
        <div class="flex flex-1 pl-[12px]">
            <!-- 添加线框 -->
            <div>
                <Label class="text-xs text-gray-500 mb-1">日期</Label>
                <DateRangePicker bind:startDate bind:endDate />
            </div>
        </div>
    </div>
    <!-- 详情 -->
    <div class="flex flex-row gap-2 pt-[8px]">
        <div class="pt-[2px] w-[24px]">
            <Text size={24} />
        </div>
        <div class="flex flex-col gap-1 flex-1 pl-[12px]">
            <!-- 描述 -->
            <Label for="description" class="text-lg text-gray-500">描述</Label>
            <!-- 关闭自动高度 -->
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
