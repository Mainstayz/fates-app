<script lang="ts">
    // 导入必要的依赖
    import { emit, listen } from "@tauri-apps/api/event";
    import { warn, debug, trace, info, error } from "@tauri-apps/plugin-log";
    import { onMount } from "svelte";

    // 导入组件
    import Timeline from "$lib/components/Timeline.svelte";
    import EventFormFields from "$lib/components/EventFormFields.svelte";
    import TaskDetailForm from "$lib/components/TaskDetailForm.svelte";
    import DailyHeatMap from "$lib/components/DailyHeatMap.svelte";
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import * as Dialog from "$lib/components/ui/dialog/index";
    import * as Select from "$lib/components/ui/select";
    import { v4 as uuidv4 } from "uuid";

    // 导入类型和工具函数
    import type { TimelineGroup, TimelineItem, TimelineData } from "$lib/types";
    import { formatDateForInput, formatTimeForInput } from "$lib/utils";
    import { Plus } from "lucide-svelte";
    import {
        getAllMatters,
        updateMatter,
        getMatterById,
        createMatter,
        deleteMatter,
        getAllTags,
        createTag,
        updateTagLastUsedAt,
        type Matter,
    } from "../store";
    import Input from "$lib/components/ui/input/input.svelte";

    // 导入 dayjs
    import dayjs from "dayjs";

    interface Tag {
        name: string;
        last_used_at: string;
    }

    // 组件状态管理
    let timelineComponent: Timeline;
    let groups: TimelineGroup[] = $state([]);
    let items: TimelineItem[] = $state([]);
    let switchAddTaskInput = $state(false);
    let switchTaskDetailInput = $state(false);

    // 编辑状态管理
    let editingItem: TimelineItem | null = $state(null);
    let editDialogOpen = $state(false);

    // 删除状态管理
    let deleteItem: TimelineItem | null = $state(null);
    let alertDelete = $state(false);
    let alertClearAll = $state(false);
    let showClearAllDialog = $state(false);

    let tags = $state<Tag[]>([]);

    // 时间范围选择状态管理
    let selectedRange = $state("1d"); // 默认选择 3 天

    // 时间范围选项
    const timeRanges = [
        { value: "6h", label: "最近 6 小时" },
        { value: "12h", label: "最近 12 小时" },
        { value: "1d", label: "最近 1 天" },
        { value: "3d", label: "最近 3 天" },
        { value: "7d", label: "最近 7 天" },
    ] as const;

    // 添加任务输入框
    let newTaskTitle = $state("");

    // 添加更新热力图数据的函数
    async function updateHeatMapData() {
        try {
            const matters = await getAllMatters();
            const dailyCounts = new Map<string, number>();

            matters.forEach((matter) => {
                // 使用 dayjs 处理日期，格式化为 YYYY-MM-DD
                const dateKey = dayjs(matter.start_time).format("YYYY-MM-DD");
                dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
            });

            heatmapData = Array.from(dailyCounts.entries()).map(([date, value]) => ({
                date,
                value,
            }));

            if (heatmapComponent) {
                heatmapComponent.redraw(heatmapData);
            }
        } catch (e) {
            error(`更新热力图数据失败: ${e}`);
        }
    }

    // 修改 saveTimelineItem
    async function saveTimelineItem(item: TimelineItem) {
        try {
            let matter = await getMatterById(item.id);
            if (matter) {
                let newMatter = {
                    ...matter,
                    title: item.content,
                    description: item.description,
                    tags: item.tags?.join(","),
                    priority: item.priority,
                    start_time: item.start.toISOString(),
                    end_time: item.end?.toISOString(),
                    type_: item.matter_type,
                    updated_at: new Date().toISOString(),
                    reserved_1: item.className,
                };
                console.log("update matter: ", newMatter);
                await updateMatter(item.id, newMatter);
                await updateHeatMapData();
                await emit("refresh-time-progress");
            }
        } catch (e) {
            error(`保存时间线数据失败: ${e}`);
        }
    }

    // 修改 deleteTimelineItem
    async function deleteTimelineItem(id: string) {
        try {
            console.log("delete matter: ", id);
            await deleteMatter(id);
            await updateHeatMapData();
            await emit("refresh-time-progress");
        } catch (e) {
            error(`删除时间线数据失败: ${e}`);
        }
    }

    // 修改 createTimelineItem
    async function createTimelineItem(title: string) {
        if (!timelineComponent) return;

        let nowDate = new Date();
        let endDate = new Date(nowDate.getTime() + 2 * 60 * 60 * 1000);
        let item: TimelineItem = {
            id: uuidv4(),
            content: title,
            start: nowDate,
            end: endDate,
        };

        let createTime = nowDate.toISOString();
        let newMatter: Matter = {
            id: item.id,
            title: item.content,
            description: item.description,
            tags: "",
            start_time: item.start.toISOString(),
            end_time: item.end!.toISOString(),
            priority: 0,
            type_: 0,
            created_at: createTime,
            updated_at: createTime,
            reserved_1: item.className,
        };

        try {
            await createMatter(newMatter);
            timelineComponent.addItem(item);
            console.log("create matter: ", newMatter);
            await updateHeatMapData();
            await emit("refresh-time-progress");
        } catch (e) {
            error(`创建时间线数据失败: ${e}`);
        }
    }

    async function createTags(tags: string[]) {
        try {
            if (tags.length === 0) return;
            console.log("create tags: ", tags);
            if (tags.length === 1) {
                await createTag(tags[0]);
            } else {
                let tagsStr = tags.join(",");
                await createTag(tagsStr);
            }
        } catch (e) {
            error(`创建标签失败: ${e}`);
        }
    }

    // 更新标签使用时间戳
    async function updateTags(tags: string[]) {
        try {
            if (tags.length === 0) return;
            console.log("update tags: ", tags);
            if (tags.length === 1) {
                await updateTagLastUsedAt(tags[0]);
            } else {
                let tagsStr = tags.join(",");
                await updateTagLastUsedAt(tagsStr);
            }
        } catch (e) {
            error(`更新标签使用时间戳失败: ${e}`);
        }
    }

    // 加载标签
    async function loadTags() {
        try {
            console.log("load tags ...");
            if (tags.length > 0) {
                tags.splice(0, tags.length);
            }
            const allTags: Tag[] = await getAllTags();
            allTags.forEach((tag: Tag) => {
                tags.push(tag);
            });
            tags.sort((a, b) => new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime());
            console.log(`load tags: ${tags.length}`);
        } catch (e) {
            error(`加载标签失败: ${e}`);
        }
    }

    // 添加热力图数据类型和状态
    interface HeatMapData {
        date: string;
        value: number;
    }

    let heatmapComponent: DailyHeatMap;
    let heatmapData: HeatMapData[] = $state([]);

    // 修改 loadTimelineData，使用新的 updateHeatMapData 函数
    async function loadTimelineData() {
        try {
            clearTimelineData();
            const matters = await getAllMatters();
            console.log("matters: ", matters);

            for (const matter of matters) {
                let newTags: string[] = [];
                if (matter.tags && matter.tags.trim() !== "") {
                    newTags = matter.tags.split(",");
                }

                timelineComponent.addItem({
                    id: matter.id,
                    group: "",
                    content: matter.title,
                    description: matter.description,
                    priority: matter.priority,
                    matter_type: matter.type_,
                    start: new Date(matter.start_time),
                    end: matter.end_time ? new Date(matter.end_time) : undefined,
                    className: matter.reserved_1,
                    tags: newTags,
                    created_at: new Date(matter.created_at),
                });
            }

            await updateHeatMapData();
        } catch (e) {
            error(`加载时间线数据失败: ${e}`);
        }
    }

    // 清除时间线所有数据
    function clearTimelineData() {
        if (!timelineComponent) return;

        const existingItems = timelineComponent.getAllItems() || [];
        existingItems.forEach((item) => timelineComponent.removeItem(item.id));
    }

    // 理论上不会走这个分支
    const handleAdd = async (item: TimelineItem, callback: (item: TimelineItem | null) => void) => {
        callback(item);
    };

    // 处理移动事件
    const handleMove = async (item: TimelineItem, callback: (item: TimelineItem | null) => void) => {
        try {
            await saveTimelineItem(item);
            callback(item);
        } catch (e) {
            error(`保存时间线数据失败: ${e}`);
            callback(null);
        }
    };

    // 处理正在移动的事件（可以添加移动限制逻辑）
    const handleMoving = (item: TimelineItem, callback: (item: TimelineItem) => void) => {
        callback(item);
    };

    // 处理更新事件
    const handleUpdate = async (item: TimelineItem, callback: (item: TimelineItem | null) => void) => {
        editingItem = item;
        editDialogOpen = true;
        callback(null);
    };

    // 处理删除事件
    const handleRemove = async (item: TimelineItem, callback: (item: TimelineItem | null) => void) => {
        deleteItem = item;
        alertDelete = true;
        callback(null);
    };

    // 处理编辑事件提交
    function handleEditSubmit(
        event: CustomEvent<{
            title: string;
            startTime: Date;
            endTime: Date;
            tags: string[];
            color: string;
        }>
    ) {
        if (!editingItem) return;

        const formData = event.detail;
        const updatedItem: TimelineItem = {
            ...editingItem,
            content: formData.title,
            start: formData.startTime,
            end: formData.endTime,
            className: formData.color,
            tags: formData.tags,
        };

        timelineComponent.updateItem(updatedItem);
        editingItem = null;
        editDialogOpen = false;
        saveTimelineItem(updatedItem);
    }

    // 对话框相关处理函数
    function handleDialogClose() {
        editingItem = null;
        editDialogOpen = false;
    }

    // 获取所有时间线项目
    export function getAllItems(): TimelineData {
        if (!timelineComponent) {
            return { groups: [], items: [] };
        }
        const allItems = timelineComponent.getAllItems() || [];
        return {
            groups: [],
            items: allItems,
        };
    }

    // 定义事件监听器配置
    const EVENT_LISTENERS = [
        {
            event: "reload_timeline_data",
            handler: () => {
                loadTags();
                loadTimelineData();
            },
        },
        {
            event: "tray_flash_did_click",
            handler: () => {
                // console.log("on tray_flash_did_click ...");
                // 发送通知消息
                // console.log("send notification message ...");
                // emit("notification-message", {
                //     title: "Hello",
                //     description: "This is a test",
                // }).then(() => {
                //     console.log("notification message sent");
                // }).catch((error) => {
                //     console.error("Failed to send notification message:", error);
                // });
            },
        },
    ] as const;

    // 统一管理事件监听器
    let unlisteners: Array<() => void> = [];

    // 设置所有事件监听器
    async function setupEventListeners() {
        for (const { event, handler } of EVENT_LISTENERS) {
            console.log("add event listener: ", event);
            const unlisten = await listen(event, handler);
            unlisteners.push(unlisten);
        }
    }

    // 清理所有事件监听器
    function cleanupEventListeners() {
        console.log("cleanup all event listeners ...");
        unlisteners.forEach((unlisten) => unlisten?.());
        unlisteners = [];
    }

    // 添加处理时间范围变化的函数
    function handleTimeRangeChange(value: string) {
        console.log("timeline range: ", value);
        selectedRange = value;
        const now = Date.now();
        let msOffset: number;

        switch (value) {
            case "6h":
                msOffset = 3 * 60 * 60 * 1000;
                break;
            case "12h":
                msOffset = 6 * 60 * 60 * 1000;
                break;
            case "1d":
                msOffset = 12 * 60 * 60 * 1000;
                break;
            case "3d":
                msOffset = 1.5 * 24 * 60 * 60 * 1000;
                break;
            case "7d":
                msOffset = 3.5 * 24 * 60 * 60 * 1000;
                break;
            default:
                msOffset = 1.5 * 24 * 60 * 60 * 1000;
        }

        timelineComponent.setWindow(new Date(now - msOffset), new Date(now + msOffset));
    }

    // 添加 effect 监听 selectedRange 的变化
    $effect(() => {
        if (timelineComponent) {
            handleTimeRangeChange(selectedRange);
        }
    });

    // 组件生命周期
    onMount(() => {
        console.log("timeline page onMount ...");
        setupEventListeners();
        loadTimelineData();
        handleTimeRangeChange(selectedRange);
        return () => {
            console.log("timeline page onUnmount ...");
            cleanupEventListeners();
        };
    });
</script>

<div class="flex flex-col h-full">
    <div class="p-6">
        <div class="flex flex-col gap-4">
            <Label class="text-2xl font-bold tracking-tight">时间追踪</Label>
            <Label class="text-base text-muted-foreground">用文字描绘每一个瞬间！</Label>
        </div>
        <div class="py-6">
            <div class="flex gap-2 justify-between">
                <div class="flex gap-2">
                    <Select.Root type="single" bind:value={selectedRange}>
                        <Select.Trigger class="w-[180px]">
                            <span>{timeRanges.find((r) => r.value === selectedRange)?.label || "选择时间范围"}</span>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Group>
                                {#each timeRanges as range}
                                    <Select.Item value={range.value}>
                                        {range.label}
                                    </Select.Item>
                                {/each}
                            </Select.Group>
                        </Select.Content>
                    </Select.Root>
                </div>

                <div class="flex gap-2">
                    <!-- 比较宽 -->
                    {#if switchAddTaskInput}
                        <!-- 输入回车提交,自动获取焦点 -->
                        <Input
                            type="text"
                            placeholder="请输入任务名称"
                            class="bg-background w-[320px]"
                            bind:value={newTaskTitle}
                            autofocus
                            onfocusout={() => {
                                switchAddTaskInput = false;
                                newTaskTitle = "";
                            }}
                            onkeydown={async (e) => {
                                if (e.key === "Enter") {
                                    // 过滤空字符串
                                    switchAddTaskInput = false;
                                    if (newTaskTitle.trim() === "") return;
                                    await createTimelineItem(newTaskTitle);
                                }
                            }}
                        />
                    {:else}
                        <Button variant="default" onclick={() => (switchAddTaskInput = true)} class="w-[320px]">
                            <Plus />
                            快速添加任务
                        </Button>
                    {/if}
                    <!-- <Button variant="default">
                        <Plus />
                        添加模版任务
                    </Button> -->
                </div>
            </div>

            <div class="pt-4">
                <Timeline
                    bind:this={timelineComponent}
                    zoomMin={1000 * 60 * 5}
                    zoomMax={1000 * 60 * 60 * 24 * 7}
                    {items}
                    start={new Date(new Date().setHours(new Date().getHours() - 12))}
                    end={new Date(new Date().setHours(new Date().getHours() + 12))}
                    onAdd={handleAdd}
                    onUpdate={handleUpdate}
                    onRemove={handleRemove}
                    onMove={handleMove}
                    onMoving={handleMoving}
                />
            </div>
            <div class="flex flex-col pt-4 gap-2">
                <Label class="text-lg text-muted-foreground">���历</Label>
                <DailyHeatMap bind:this={heatmapComponent} data={heatmapData} />
            </div>
        </div>
    </div>

    <!-- 编辑页面 -->
    <Dialog.Root bind:open={editDialogOpen} onOpenChange={handleDialogClose}>
        <Dialog.Content>
            {#if editingItem}
                <TaskDetailForm
                    item={editingItem}
                    tagsList={tags.map((tag) => tag.name)}
                    callback={(item: TimelineItem, newTags: string[], selectedTags: string[]) => {
                        console.log("edit finish, save timeline item ...", item);
                        Promise.all([createTags(newTags), saveTimelineItem(item)])
                            .then(() => {
                                timelineComponent.updateItem(item);
                                editingItem = null;
                                return updateTags(selectedTags);
                            })
                            .then(() => {
                                loadTags();
                            })
                            .catch((error) => {
                                console.error("Failed to save changes:", error);
                            });
                    }}
                />
            {/if}
        </Dialog.Content>
    </Dialog.Root>

    {#if deleteItem}
        <AlertDialog.Root bind:open={alertDelete}>
            <AlertDialog.Content>
                <AlertDialog.Header>
                    <AlertDialog.Title>确定删除吗？</AlertDialog.Title>
                    <AlertDialog.Description>删除后将无法恢复，请谨慎操作！</AlertDialog.Description>
                </AlertDialog.Header>
                <AlertDialog.Footer>
                    <AlertDialog.Cancel>取消</AlertDialog.Cancel>
                    <AlertDialog.Action
                        onclick={async () => {
                            alertDelete = false;
                            if (deleteItem) {
                                await deleteTimelineItem(deleteItem.id);
                                timelineComponent.removeItem(deleteItem.id);
                                deleteItem = null;
                            }
                        }}
                    >
                        确定删除
                    </AlertDialog.Action>
                </AlertDialog.Footer>
            </AlertDialog.Content>
        </AlertDialog.Root>
    {/if}
</div>
