<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Button } from "$lib/components/ui/button";
    import * as Popover from "$lib/components/ui/popover";
    import { Textarea } from "$lib/components/ui/textarea";
    import { PanelTop, Plus, Circle, Leaf, Flame, Zap, Timer, Text } from "lucide-svelte";
    import TagsAddButton from "./TagsAddButton.svelte";
    import DateRangePicker from "./DateRangePicker.svelte";
    import { onMount, onDestroy } from "svelte";
    import type { TimelineItem } from "$lib/types";

    let {
        item,
        tagsList: initialTagsList,
        callback,
    }: {
        item: TimelineItem;
        tagsList: string[];
        callback: (item: TimelineItem, newTags: string[], selectedTags: string[]) => void;
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

    let origianlSelectedTags: string[] = [];

    let localItem = $state({ ...item }); // 创建本地副本
    let localTagsList = $state([...initialTagsList]); // 创建本地副本
    // 使用 $state 绑定到 item 的属性
    let content = $state(item.content);
    let description = $state(item.description || "");
    let priority = $state<number>(item.priority || Priority.Medium);
    let startDate = $state(formatDateForInput(item.start));
    let endDate = $state(item.end ? formatDateForInput(item.end) : formatDateForInput(new Date()));
    let selectedTags = $state(item.tags || []);

    // 优先级 open 状态管理
    let priorityOpen = $state(false);

    // 监听变化并更新 item
    function updateItem() {
        let className = "";
        let priorityNumber = 0;
        switch (priority) {
            case Priority.Low:
                className = "green";
                priorityNumber = -1;
                break;
            case Priority.Medium:
                className = "blue";
                priorityNumber = 0;
                break;
            case Priority.High:
                className = "red";
                priorityNumber = 1;
                break;
        }

        let newTags = selectedTags.filter((tag) => tag !== "");
        // 过滤空字符串
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

    function getPriorityLabel(value: number) {
        return PRIORITY_COLORS.find((c) => c.value === value)?.label ?? "选择优先级";
    }

    // 格式化日期为 YYYY-MM-DD
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
                if (!localTagsList.includes(tag)) {
                    localTagsList.unshift(tag);
                }
            }
        }
        return () => {
            let diffTags = selectedTags.filter((tag) => !origianlSelectedTags.includes(tag));
            let outputTags = [...selectedTags];
            const updatedItem = updateItem();
            console.log("Before callback - updatedItem:", updatedItem);
            console.log("Before callback - diffTags:", diffTags);
            console.log("Before callback - outputTags:", outputTags);
            callback(updatedItem, diffTags, outputTags);
        };
    });

    onDestroy(() => {});
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
                    <Popover.Root bind:open={priorityOpen}>
                        <Popover.Trigger>
                            <Button
                                variant="outline"
                                class="w-[160px] h-[32px] justify-start shadow-none"
                                onclick={() => {
                                    priorityOpen = true;
                                }}
                            >
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
                                        onclick={() => {
                                            priority = priorityOption.value;
                                            console.log("priority changed:", priority);
                                            // close popover
                                            priorityOpen = false;
                                        }}
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
                    <TagsAddButton bind:tagsList={localTagsList} bind:selectedTags />
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
