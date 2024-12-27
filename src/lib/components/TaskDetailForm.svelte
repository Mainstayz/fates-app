<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Textarea } from "$lib/components/ui/textarea";
    import { PanelTop, Text } from "lucide-svelte";
    import TagsAddButton from "./TagsAddButton.svelte";
    import DateRangePicker from "./DateRangePicker.svelte";
    import { onMount, onDestroy } from "svelte";
    import type { TimelineItem } from "$lib/types";
    import { Priority } from "$lib/types";
    import PrioritySelector from "./PrioritySelector.svelte";

    let {
        item,
        tagsList: initialTagsList,
        callback,
    }: {
        item: TimelineItem;
        tagsList: string[];
        callback: (item: TimelineItem, newTags: string[], selectedTags: string[]) => void;
    } = $props();

    let localItem = $state({ ...item }); // 创建本地副本

    // 使用 $state 绑定到 item 的属性
    let content = $state(item.content);
    let description = $state(item.description || "");
    // 声明可选值范围
    let priority = $state<Priority>(item.priority || Priority.Medium);
    let startDate = $state(formatDateForInput(item.start));
    let endDate = $state(item.end ? formatDateForInput(item.end) : formatDateForInput(new Date()));

    let localTagsList: string[] = [...(initialTagsList || [])]; // 创建本地副本
    let localSelectedTags: string[] = [...(item.tags || [])];

    // 监听变化并更新 item
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

    function handleTagsChange(tagsList: string[], selectedTags: string[]) {
        localTagsList = tagsList;
        localSelectedTags = selectedTags;
    }

    onMount(() => {
        // 获取输入框元素
        // const inputElement = document.querySelector('input[placeholder="任务标题"]');
        // if (inputElement) {
        //     // 移除焦点
        //     (inputElement as HTMLElement).blur();
        //     // 防止自动获取焦点
        //     (inputElement as HTMLElement).setAttribute("tabindex", "-1");
        // }
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
        <button class="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"> 按钮 </button>
    </div>
    <!-- Tags，以及 ��先级 -->
    <div class="flex flex-row gap-2">
        <div class="w-[24px]"></div>
        <div class="flex flex-1 gap-8 pl-[12px]">
            <div class="w-[160px]">
                <div class="text-xs text-gray-500 mb-1">优先级</div>
                <div class="h-[32px]">
                    <PrioritySelector
                        bind:priority
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
