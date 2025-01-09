<script lang="ts">
    // 导入必要的依赖
    import platform, { REFRESH_TIME_PROGRESS } from "$src/platform";
    import type { Matter } from "$src/types";
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";
    import _ from "$src/tag-manager.svelte";
    // 导入组件
    import DailyHeatMap from "$lib/components/daily-heat-map.svelte";
    import TaskDetailForm from "$lib/components/task-detail-form.svelte";
    import Timeline from "$src/lib/components/time-line.svelte";
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import { Button } from "$lib/components/ui/button";
    import * as Dialog from "$lib/components/ui/dialog/index";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import { v4 as uuidv4 } from "uuid";

    import Input from "$lib/components/ui/input/input.svelte";
    import type { TimelineData, TimelineGroup, TimelineItem } from "$lib/types";
    import { Plus } from "lucide-svelte";

    import dayjs from "dayjs";

    import { NOTIFICATION_RELOAD_TIMELINE_DATA } from "../config";

    interface Tag {
        name: string;
        last_used_at: string;
    }

    let timelineComponent: Timeline;
    let groups: TimelineGroup[] = $state([]);
    let items: TimelineItem[] = $state([]);
    let switchAddTaskInput = $state(false);

    let editingItem: TimelineItem | null = $state(null);
    let editDialogOpen = $state(false);

    let deleteItem: TimelineItem | null = $state(null);
    let alertDelete = $state(false);

    let tags = $state<Tag[]>([]);

    let selectedRange = $state("1d");

    const timeRanges = $derived([
        { value: "6h", label: $t("app.timeline.timeRanges.6h") },
        { value: "12h", label: $t("app.timeline.timeRanges.12h") },
        { value: "1d", label: $t("app.timeline.timeRanges.1d") },
        { value: "3d", label: $t("app.timeline.timeRanges.3d") },
        { value: "7d", label: $t("app.timeline.timeRanges.7d") },
    ]);

    let newTaskTitle = $state("");

    async function updateHeatMapData() {
        try {
            const matters = await platform.instance.storage.listMatters();
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
            console.error(`Update heatmap data failed: ${e}`);
        }
    }

    async function saveTimelineItem(item: TimelineItem) {
        try {
            let matter = await platform.instance.storage.getMatter(item.id);
            if (matter) {
                let newMatter: Matter = {
                    ...matter,
                    title: item.content,
                    description: item.description,
                    tags: item.tags?.join(","),
                    priority: item.priority || 0,
                    start_time: item.start.toISOString(),
                    end_time: item.end?.toISOString() || "",
                    type_: item.matter_type || 0,
                    updated_at: new Date().toISOString(),
                    reserved_1: item.className,
                };
                console.log("[TimelinePage] Update matter:", newMatter);
                await platform.instance.storage.updateMatter(newMatter);
                await updateHeatMapData();
                await platform.instance.event.emit(REFRESH_TIME_PROGRESS);
            }
        } catch (e) {
            console.error(`[TimelinePage] Save matter failed: ${e}`);
        }
    }

    async function deleteTimelineItem(id: string) {
        try {
            console.log(`[TimelinePage] Delete matter: ${id}`);
            await platform.instance.storage.deleteMatter(id);
            await updateHeatMapData();
            await platform.instance.event.emit(REFRESH_TIME_PROGRESS);
        } catch (e) {
            console.error(`[TimelinePage] Delete matter failed: ${e}`);
        }
    }

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
            await platform.instance.storage.createMatter(newMatter);
            if (inputItem) {
                timelineComponent.updateItem(item);
            } else {
                timelineComponent.addItem(item);
            }
            console.log("[TimelinePage] Create matter:", newMatter);
            await updateHeatMapData();
            await platform.instance.event.emit(REFRESH_TIME_PROGRESS);
        } catch (e) {
            console.error("[TimelinePage] Create matter failed:", e);
        }
    }

    interface HeatMapData {
        date: string;
        value: number;
    }

    let heatmapComponent: DailyHeatMap;
    let heatmapData: HeatMapData[] = $state([]);

    class TimelineDataManager {
        constructor(private timelineComponent: Timeline) {}

        async loadTimelineData() {
            try {
                this.clearTimelineData();
                const matters = await platform.instance.storage.listMatters();

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
                await platform.instance.event.emit(REFRESH_TIME_PROGRESS);
            } catch (e) {
                console.error(`Load timeline data failed: ${e}`);
            }
        }

        async updateHeatMapData() {
            try {
                const matters = await platform.instance.storage.listMatters();
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
                console.error(`Update heatmap data failed: ${e}`);
            }
        }

        clearTimelineData() {
            if (!this.timelineComponent) return;

            const existingItems = this.timelineComponent.getAllItems() || [];
            existingItems.forEach((item) => this.timelineComponent.removeItem(item.id));
        }
    }

    class TimelineEventHandler {
        constructor(private timelineComponent: Timeline) {}

        async handleAdd(item: TimelineItem, callback: (item: TimelineItem | null) => void) {
            if (item.content == `#${$t("app.timeline.newTaskTitle")}`) {
                createTimelineItem(newTaskTitle, item);
            }
            callback(item);
        }

        async handleMove(item: TimelineItem, callback: (item: TimelineItem | null) => void) {
            try {
                await saveTimelineItem(item);
                callback(item);
            } catch (e) {
                console.error(`Save timeline item failed: ${e}`);
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

    function handleDialogClose() {
        editingItem = null;
        editDialogOpen = false;
    }

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

    const EVENT_LISTENERS = [
        {
            event: NOTIFICATION_RELOAD_TIMELINE_DATA,
            handler: () => {
                timelineDataManager?.loadTimelineData();
            },
        },
    ] as const;

    let unlisteners: Array<() => void> = [];

    async function setupEventListeners() {
        for (const { event, handler } of EVENT_LISTENERS) {
            console.log(`[TimelinePage] Add event listener: ${event}`);
            const unlisten = await platform.instance.event.listen(event, handler);
            unlisteners.push(unlisten);
        }
    }

    function cleanupEventListeners() {
        console.log("[TimelinePage] Cleanup all event listeners ...");
        unlisteners.forEach((unlisten) => unlisten?.());
        unlisteners = [];
    }

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

    function handleTimeRangeChange(value: string) {
        if (!timelineComponent) return;

        console.log(`[TimelinePage] Timeline range changed: ${value}`);
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

    $effect(() => {
        if (timelineComponent) {
            handleTimeRangeChange(selectedRange);
        }
    });

    let timelineDataManager: TimelineDataManager;
    let timeRangeManager: TimeRangeManager;
    let eventHandler: TimelineEventHandler;

    onMount(() => {
        console.log("[TimelinePage] onMount ...");

        if (!timelineComponent) {
            console.error("[TimelinePage] Timeline component not initialized");
            return;
        }

        timelineDataManager = new TimelineDataManager(timelineComponent);
        timeRangeManager = new TimeRangeManager(timelineComponent);
        eventHandler = new TimelineEventHandler(timelineComponent);

        setupEventListeners();

        timelineDataManager.loadTimelineData();
        timeRangeManager.handleTimeRangeChange(selectedRange as keyof typeof timeRangeManager.TIME_RANGES);

        return () => {
            console.log("[TimelinePage] onUnmount ...");
            cleanupEventListeners();
        };
    });

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
                    {#if switchAddTaskInput}
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
                </div>
            </div>

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

            <div class="flex flex-col pt-4 gap-2">
                <Label class="text-lg text-muted-foreground">
                    {$t("app.timeline.taskCompletionStatusLastYear", { values: { year: new Date().getFullYear() } })}
                </Label>
                <DailyHeatMap bind:this={heatmapComponent} data={heatmapData} />
            </div>
        </div>
    </div>

    <Dialog.Root bind:open={editDialogOpen} onOpenChange={handleDialogClose}>
        <Dialog.Portal>
            <Dialog.Overlay class="bg-[#000000]/20" />
            <Dialog.Content trapFocus={false} interactOutsideBehavior="ignore">
                <TaskDetailForm
                    item={editingItem!}
                    callback={(item: TimelineItem) => {
                        console.log("[TimelinePage] Edit finish, will update matter:", item);
                        timelineComponent.updateItem(item);
                        editingItem = null;
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
