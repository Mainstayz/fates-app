<script lang="ts">
    // 导入必要的依赖
    import { window, app } from "@tauri-apps/api";
    import { Window as TauriWindow } from "@tauri-apps/api/window";
    import { emit, listen } from "@tauri-apps/api/event";
    import { warn, debug, trace, info, error } from "@tauri-apps/plugin-log";
    import { invoke } from "@tauri-apps/api/core";
    import { onMount } from "svelte";

    // 导入组件
    import Timeline from "$lib/components/Timeline.svelte";
    import AddEventForm from "$lib/components/AddEventForm.svelte";
    import EventFormFields from "$lib/components/EventFormFields.svelte";
    import TaskDetailForm from "$lib/components/TaskDetailForm.svelte";
    import { Button, buttonVariants } from "$lib/components/ui/button";
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import * as Dialog from "$lib/components/ui/dialog/index";
    import * as Select from "$lib/components/ui/select";

    // 导入类型和工具函数
    import type { TimelineGroup, TimelineItem, TimelineData } from "$lib/types";
    import { formatDateForInput, formatTimeForInput } from "$lib/utils";
    import { Settings, Moon, Sun, Plus, Trash2 } from "lucide-svelte";
    import Input from "$lib/components/ui/input/input.svelte";

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

    /**
     * 数据持久化相关函数
     */
    // 保存时间线数据到本地存储
    async function saveTimelineData() {
        if (!timelineComponent) return;

        const timelineData = {
            groups: timelineComponent.getAllGroups() || [],
            items: timelineComponent.getAllItems() || [],
        };
        try {
            await invoke("save_timeline_data", { data: timelineData });
        } catch (e) {
            error(`保存时间线数据失败: ${e}`);
        }
    }

    // 从本地存储加载时间线数据
    async function loadTimelineData() {
        try {
            console.log("尝试加载时间线数据 ...");
            const result = await invoke<{ groups: any[]; items: any[] } | null>("load_timeline_data");
            if (!result) {
                console.log("加载时间线数据失败：没有数据");
                return;
            }
            console.log("加载时间线数据：", result);
            groups = result.groups || [];
            items = result.items || [];

            if (timelineComponent) {
                // 清除现有数据
                clearTimelineData();
                // 重新加载数据
                result.groups?.forEach((group) => timelineComponent.addGroup(group));
                result.items?.forEach((item) => timelineComponent.addItem(item));
            }
        } catch (e) {
            error(`加载时间线数据失败: ${e}`);
        }
    }

    // 清除时间线所有数据
    function clearTimelineData() {
        if (!timelineComponent) return;

        const existingItems = timelineComponent.getAllItems() || [];
        existingItems.forEach((item) => timelineComponent.removeItem(item.id));

        const existingGroups = timelineComponent.getAllGroups() || [];
        existingGroups.forEach((group) => timelineComponent.removeGroup(group.id));
    }

    /**
     * Timeline 事件处理函数
     */
    // 处理添加事件
    const handleAdd = async (item: TimelineItem, callback: (item: TimelineItem | null) => void) => {
        callback(item);
        await saveTimelineData();
    };

    // 处理移动事件
    const handleMove = async (item: TimelineItem, callback: (item: TimelineItem | null) => void) => {
        callback(item);
        await saveTimelineData();
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

    /**
     * 表单提交处理函数
     */
    // 处理新事件提交
    function handleEventSubmit(
        event: CustomEvent<{
            title: string;
            startTime: Date;
            endTime: Date;
            tags: string[];
            color: string;
        }>
    ) {
        const formData = event.detail;
        const newItem: TimelineItem = {
            id: Date.now().toString(),
            content: formData.title,
            start: formData.startTime.toISOString(),
            end: formData.endTime.toISOString(),
            className: formData.color,
            tags: formData.tags,
        };

        timelineComponent.addItem(newItem);
        saveTimelineData();
    }

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
            start: formData.startTime.toISOString(),
            end: formData.endTime.toISOString(),
            className: formData.color,
            tags: formData.tags,
        };

        timelineComponent.updateItem(updatedItem);
        editingItem = null;
        editDialogOpen = false;
        saveTimelineData();
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
        const allGroups = timelineComponent.getAllGroups() || [];
        const allItems = timelineComponent.getAllItems() || [];
        return {
            groups: allGroups,
            items: allItems,
        };
    }

    // 定义事件监听器配置
    const EVENT_LISTENERS = [
        {
            event: "reload_timeline_data",
            handler: () => {
                console.log("on reload_timeline_data ...");
                loadTimelineData();
            },
        },
        {
            event: "tray_flash_did_click",
            handler: () => {
                console.log("on tray_flash_did_click ...");
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
            console.log("设置事件监听器：", event);
            const unlisten = await listen(event, handler);
            unlisteners.push(unlisten);
        }
    }

    // 清理所有事件监听器
    function cleanupEventListeners() {
        console.log("清理事件监听器 ...");
        unlisteners.forEach((unlisten) => unlisten?.());
        unlisteners = [];
    }

    // 添加处理时间范围变化的函数
    function handleTimeRangeChange(value: string) {
        console.log("handleTimeRangeChange: ", value);
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
        debug("时间线组件已挂载");
        setupEventListeners();
        loadTimelineData();
        const autoSaveInterval = setInterval(saveTimelineData, 60 * 1000);
        handleTimeRangeChange(selectedRange);
        return () => {
            debug("时间线组件即将卸载");
            clearInterval(autoSaveInterval);
            saveTimelineData();
            cleanupEventListeners();
        };
    });
</script>

<div class="flex flex-col h-full">
    <div class="p-6">
        <div>
            <h2 class="text-2xl font-bold tracking-tight">时间追踪</h2>
            <p class="text-muted-foreground">用文字描绘每一个瞬间！</p>
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
                            class="w-[320px]"
                            autofocus
                            onkeydown={(e) => {
                                if (e.key === "Enter") {
                                    switchAddTaskInput = false;
                                }
                            }}
                        />
                    {:else}
                        <Button variant="default" onclick={() => (switchTaskDetailInput = true)} class="w-[320px]">
                            <Plus />
                            快速添加任务
                        </Button>
                    {/if}
                    <AddEventForm on:submit={handleEventSubmit} />
                    <!-- <Button variant="default">
                        <Plus />
                        添加模版任务
                    </Button> -->

                    <!-- 添加事件表单<AddEventForm on:submit={handleEventSubmit} />
                    {#if showClearAllDialog}
                        <AlertDialog.Root bind:open={alertClearAll}>
                            <AlertDialog.Trigger class={buttonVariants({ variant: "destructive" })}>
                                <Trash2 />
                            </AlertDialog.Trigger>
                            <AlertDialog.Content>
                                <AlertDialog.Header>
                                    <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
                                    <AlertDialog.Description>
                                        This action cannot be undone. This will permanently delete your all records.
                                    </AlertDialog.Description>
                                </AlertDialog.Header>
                                <AlertDialog.Footer>
                                    <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                                    <AlertDialog.Action
                                        onclick={async () => {
                                            timelineComponent.clearAll();
                                            await saveTimelineData();
                                            alertClearAll = false;
                                        }}>Confirm</AlertDialog.Action
                                    >
                                </AlertDialog.Footer>
                            </AlertDialog.Content>
                        </AlertDialog.Root>
                    {/if} -->
                </div>
            </div>

            <Timeline
                bind:this={timelineComponent}
                zoomMin={1000 * 60 * 5}
                zoomMax={1000 * 60 * 60 * 24 * 7}
                {items}
                {groups}
                start={new Date(new Date().setHours(new Date().getHours() - 12))}
                end={new Date(new Date().setHours(new Date().getHours() + 12))}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                onMove={handleMove}
                onMoving={handleMoving}
            />
        </div>
    </div>

    <!-- 编辑页面 -->
    <Dialog.Root bind:open={editDialogOpen} onOpenChange={handleDialogClose}>
        <Dialog.Content class="sm:max-w-[425px]">
            <Dialog.Header>
                <Dialog.Title>编辑事件</Dialog.Title>
                <Dialog.Description>修改事件的详细信息</Dialog.Description>
            </Dialog.Header>
            {#if editingItem}
                <EventFormFields
                    title={editingItem.content}
                    tags={editingItem.tags?.join(", ")}
                    color={editingItem.className as "blue" | "green" | "red" | "yellow"}
                    startDateInput={formatDateForInput(new Date(editingItem.start))}
                    startTimeInput={formatTimeForInput(new Date(editingItem.start))}
                    endDateInput={formatDateForInput(new Date(editingItem.end || ""))}
                    endTimeInput={formatTimeForInput(new Date(editingItem.end || ""))}
                    onSubmit={(formData: any) => {
                        if (!editingItem) return;
                        handleEditSubmit(new CustomEvent("submit", { detail: formData }));
                    }}
                />
            {/if}
        </Dialog.Content>
    </Dialog.Root>
    <Dialog.Root bind:open={switchTaskDetailInput}>
        <Dialog.Content>
            <TaskDetailForm />
        </Dialog.Content>
    </Dialog.Root>

    {#if deleteItem}
        <AlertDialog.Root bind:open={alertDelete}>
            <AlertDialog.Content>
                <AlertDialog.Header>
                    <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
                    <AlertDialog.Description>
                        This action cannot be undone. This will permanently delete your event.
                    </AlertDialog.Description>
                </AlertDialog.Header>
                <AlertDialog.Footer>
                    <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                    <AlertDialog.Action
                        onclick={async () => {
                            alertDelete = false;
                            if (deleteItem) {
                                timelineComponent.removeItem(deleteItem.id);
                                await saveTimelineData(); // 删除后保存
                                deleteItem = null;
                            }
                        }}>Confirm</AlertDialog.Action
                    >
                </AlertDialog.Footer>
            </AlertDialog.Content>
        </AlertDialog.Root>
    {/if}
</div>
