<script lang="ts">
    // 导入必要的依赖
    import { emit, listen } from "@tauri-apps/api/event";
    import { error } from "@tauri-apps/plugin-log";
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";

    // 导入组件
    import Timeline from "$lib/components/Timeline.svelte";
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

    import { NOTIFICATION_RELOAD_TIMELINE_DATA } from "../config";

    interface Tag {
        name: string;
        last_used_at: string;
    }

    // 组件状态管理
    let timelineComponent: Timeline;
    let groups: TimelineGroup[] = $state([]);
    let items: TimelineItem[] = $state([]);
    let switchAddTaskInput = $state(false);

    // 编辑状态管理
    let editingItem: TimelineItem | null = $state(null);
    let editDialogOpen = $state(false);

    // 删除状态管理
    let deleteItem: TimelineItem | null = $state(null);
    let alertDelete = $state(false);

    let tags = $state<Tag[]>([]);

    // 时间范围选择状态管理
    let selectedRange = $state("1d"); // 默认选择 3 天

    // 时间范围选项
    const timeRanges = $derived([
        { value: "6h", label: $t("app.timeline.timeRanges.6h") },
        { value: "12h", label: $t("app.timeline.timeRanges.12h") },
        { value: "1d", label: $t("app.timeline.timeRanges.1d") },
        { value: "3d", label: $t("app.timeline.timeRanges.3d") },
        { value: "7d", label: $t("app.timeline.timeRanges.7d") },
    ]);

    // 添加任务输入框
    let newTaskTitle = $state("");

    // 添加更新热力图数据的函数
    async function updateHeatMapData() {
        try {
            const matters = await getAllMatters();
            const dailyCounts = matters.reduce((acc, matter) => {
                const dateKey = dayjs(matter.start_time).format("YYYY-MM-DD");
                acc.set(dateKey, (acc.get(dateKey) || 0) + 1);
                return acc;
            }, new Map<string, number>());

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
    async function createTimelineItem(title: string, inputItem?: TimelineItem) {
        if (!timelineComponent) return;

        let item: TimelineItem;
        let nowDate: Date;
        if (inputItem) {
            item = inputItem;
            nowDate = item.start;
        } else {
            nowDate = new Date();
            let endDate = new Date(nowDate.getTime() + 2 * 60 * 60 * 1000);
            item = {
                id: uuidv4(),
                content: title,
                start: nowDate,
                end: endDate,
                className: "blue",
            };
        }

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
            if (inputItem) {
                timelineComponent.updateItem(item);
            } else {
                timelineComponent.addItem(item);
            }
            console.log("create matter: ", newMatter);
            await updateHeatMapData();
            await emit("refresh-time-progress");
        } catch (e) {
            error(`创建时间线数据失败: ${e}`);
        }
    }

    // 将标签管理相关的代码抽取为一个独立的类
    class TagManager {
        async createTags(tags: string[]) {
            try {
                if (!tags.length) return;

                const tagsStr = tags.length === 1 ? tags[0] : tags.join(",");
                await createTag(tagsStr);
            } catch (e) {
                error(`创建标签失败: ${e}`);
            }
        }

        async updateTags(tags: string[]) {
            try {
                if (!tags.length) return;

                const tagsStr = tags.length === 1 ? tags[0] : tags.join(",");
                await updateTagLastUsedAt(tagsStr);
            } catch (e) {
                error(`更新标签使用时间戳���败: ${e}`);
            }
        }

        async loadTags() {
            try {
                tags.splice(0, tags.length);
                const allTags: Tag[] = await getAllTags();
                tags.push(...allTags);
                tags.sort((a, b) => new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime());
            } catch (e) {
                error(`加载标签失败: ${e}`);
            }
        }
    }

    // 添加热力图数据类型和状态
    interface HeatMapData {
        date: string;
        value: number;
    }

    let heatmapComponent: DailyHeatMap;
    let heatmapData: HeatMapData[] = $state([]);

    // 将数据操作相关的代码抽取为一个独立的类
    class TimelineDataManager {
        constructor(private timelineComponent: Timeline) {}

        async loadTimelineData() {
            try {
                this.clearTimelineData();
                const matters = await getAllMatters();

                for (const matter of matters) {
                    const newTags = matter.tags?.trim() ? matter.tags.split(",") : [];

                    this.timelineComponent.addItem({
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

                await this.updateHeatMapData();
                await emit("refresh-time-progress");
            } catch (e) {
                error(`加载时间线数据失败: ${e}`);
            }
        }

        async updateHeatMapData() {
            try {
                const matters = await getAllMatters();
                const dailyCounts = matters.reduce((acc, matter) => {
                    const dateKey = dayjs(matter.start_time).format("YYYY-MM-DD");
                    acc.set(dateKey, (acc.get(dateKey) || 0) + 1);
                    return acc;
                }, new Map<string, number>());

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

        clearTimelineData() {
            if (!this.timelineComponent) return;

            const existingItems = this.timelineComponent.getAllItems() || [];
            existingItems.forEach((item) => this.timelineComponent.removeItem(item.id));
        }
    }

    // 将事件处理相关的代码抽取为一个独立的类
    class TimelineEventHandler {
        constructor(private timelineComponent: Timeline) {}

        async handleAdd(item: TimelineItem, callback: (item: TimelineItem | null) => void) {
            // 可能是双击添加的
            if (item.content == "#新任务") {
                createTimelineItem(newTaskTitle, item);
            }
            callback(item);
        }

        async handleMove(item: TimelineItem, callback: (item: TimelineItem | null) => void) {
            try {
                await saveTimelineItem(item);
                callback(item);
            } catch (e) {
                error(`保存时间线数据失败: ${e}`);
                callback(null);
            }
        }

        handleMoving(item: TimelineItem, callback: (item: TimelineItem) => void) {
            callback(item);
        }

        async handleUpdate(item: TimelineItem, callback: (item: TimelineItem | null) => void) {
            editingItem = item;
            editDialogOpen = true;
            callback(null);
        }

        async handleRemove(item: TimelineItem, callback: (item: TimelineItem | null) => void) {
            deleteItem = item;
            alertDelete = true;
            callback(null);
        }
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
            event: NOTIFICATION_RELOAD_TIMELINE_DATA,
            handler: () => {
                tagManager?.loadTags();
                timelineDataManager?.loadTimelineData();
            },
        },
        {
            event: "tray_flash_did_click",
            handler: () => {},
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

    // 将时间范围管理相关的代码抽取为一个独立的类
    class TimeRangeManager {
        public readonly TIME_RANGES = {
            "6h": 3 * 60 * 60 * 1000,
            "12h": 6 * 60 * 60 * 1000,
            "1d": 12 * 60 * 60 * 1000,
            "3d": 1.5 * 24 * 60 * 60 * 1000,
            "7d": 3.5 * 24 * 60 * 60 * 1000,
        } as const;

        constructor(private timelineComponent: Timeline) {}

        handleTimeRangeChange(value: keyof typeof this.TIME_RANGES) {
            const now = Date.now();
            const msOffset = this.TIME_RANGES[value] ?? this.TIME_RANGES["1d"];

            this.timelineComponent.setWindow(new Date(now - msOffset), new Date(now + msOffset));
        }
    }

    // 添加处理时间范围变化的函数
    function handleTimeRangeChange(value: string) {
        if (!timelineComponent) return;

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

    // 加 effect 监听 selectedRange 的变化
    $effect(() => {
        if (timelineComponent) {
            handleTimeRangeChange(selectedRange);
        }
    });

    // 首先声明管理器实例变量
    let timelineDataManager: TimelineDataManager;
    let tagManager: TagManager;
    let timeRangeManager: TimeRangeManager;
    let eventHandler: TimelineEventHandler;

    // 修改 onMount，删除重复的 onMount 调用
    onMount(() => {
        console.log("timeline page onMount ...");

        // 确保 timelineComponent 已经初始化
        if (!timelineComponent) {
            error("Timeline component not initialized");
            return;
        }

        // 初始化各个管理器
        timelineDataManager = new TimelineDataManager(timelineComponent);
        tagManager = new TagManager();
        timeRangeManager = new TimeRangeManager(timelineComponent);
        eventHandler = new TimelineEventHandler(timelineComponent);

        // 设置事件监听器
        setupEventListeners();

        // 加载数据
        timelineDataManager.loadTimelineData();
        tagManager.loadTags();

        // 设置时间范围
        timeRangeManager.handleTimeRangeChange(selectedRange as keyof typeof timeRangeManager.TIME_RANGES);

        // 清理函数
        return () => {
            console.log("timeline page onUnmount ...");
            cleanupEventListeners();
        };
    });

    // 将事件处理相关的代码修改为普通函数
    const handleAdd = async (item: TimelineItem, callback: (item: TimelineItem | null) => void) => {
        if (eventHandler) {
            await eventHandler.handleAdd(item, callback);
        } else {
            callback(null);
        }
    };

    const handleMove = async (item: TimelineItem, callback: (item: TimelineItem | null) => void) => {
        if (eventHandler) {
            await eventHandler.handleMove(item, callback);
        } else {
            callback(null);
        }
    };

    const handleMoving = (item: TimelineItem, callback: (item: TimelineItem) => void) => {
        if (eventHandler) {
            eventHandler.handleMoving(item, callback);
        } else {
            callback(item);
        }
    };

    const handleUpdate = async (item: TimelineItem, callback: (item: TimelineItem | null) => void) => {
        if (eventHandler) {
            await eventHandler.handleUpdate(item, callback);
        } else {
            callback(null);
        }
    };

    const handleRemove = async (item: TimelineItem, callback: (item: TimelineItem | null) => void) => {
        if (eventHandler) {
            await eventHandler.handleRemove(item, callback);
        } else {
            callback(null);
        }
    };
</script>

<div class="flex flex-col h-full">
    <div class="p-6">
        <div class="flex flex-col gap-4">
            <Label class="text-2xl font-bold tracking-tight">{$t("app.timeline.title")}</Label>
            <Label class="text-base text-muted-foreground">{$t("app.timeline.description")}</Label>
        </div>
        <div class="flex flex-col py-6 gap-2">
            <!-- 时间范围选择 -->
            <div class="flex gap-2 justify-between">
                <div class="flex gap-2">
                    <Select.Root type="single" bind:value={selectedRange}>
                        <Select.Trigger class="w-[180px]">
                            <span
                                >{timeRanges.find((r) => r.value === selectedRange)?.label ||
                                    $t("app.timeline.timeRanges.default")}</span
                            >
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
                            placeholder={$t("app.timeline.addTaskPlaceholder")}
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
                            {$t("app.timeline.addTask")}
                        </Button>
                    {/if}
                    <!-- <Button variant="default">
                        <Plus />
                        添加模版任务
                    </Button> -->
                </div>
            </div>

            <!-- 时间线 -->
            <div class="pt-0">
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

            <!-- 历史热力图 -->
            <div class="flex flex-col pt-4 gap-2">
                <Label class="text-lg text-muted-foreground">{$t("app.timeline.taskCompletionStatusLastYear")}</Label>
                <DailyHeatMap bind:this={heatmapComponent} data={heatmapData} />
            </div>
        </div>
    </div>

    <!-- 编辑页面 -->
    <Dialog.Root bind:open={editDialogOpen} onOpenChange={handleDialogClose}>
        <Dialog.Portal>
            <Dialog.Overlay class="bg-[#000000]/20" />
            <Dialog.Content trapFocus={false} interactOutsideBehavior="ignore">
                <TaskDetailForm
                    item={editingItem!}
                    tagsList={tags.map((tag) => tag.name)}
                    callback={(item: TimelineItem, newTags: string[], selectedTags: string[]) => {
                        console.log("edit finish, save timeline item ...", item);
                        Promise.all([tagManager.createTags(newTags), saveTimelineItem(item)])
                            .then(() => {
                                timelineComponent.updateItem(item);
                                editingItem = null;
                                return tagManager.updateTags(selectedTags);
                            })
                            .then(() => {
                                tagManager.loadTags();
                            })
                            .catch((error) => {
                                console.error("Failed to save changes:", error);
                            });
                    }}
                />
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>

    {#if deleteItem}
        <AlertDialog.Root bind:open={alertDelete}>
            <AlertDialog.Content>
                <AlertDialog.Header>
                    <AlertDialog.Title>{$t("app.other.confirmDelete")}</AlertDialog.Title>
                    <AlertDialog.Description>{$t("app.other.confirmDeleteDescription")}</AlertDialog.Description>
                </AlertDialog.Header>
                <AlertDialog.Footer>
                    <AlertDialog.Cancel>{$t("app.other.cancel")}</AlertDialog.Cancel>
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
                        {$t("app.other.confirm")}
                    </AlertDialog.Action>
                </AlertDialog.Footer>
            </AlertDialog.Content>
        </AlertDialog.Root>
    {/if}
</div>
