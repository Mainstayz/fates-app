<script lang="ts">
    import Handlebars from "handlebars";
    import { onMount, onDestroy } from "svelte";
    import { Timeline, DataSet, type TimelineOptions } from "vis-timeline/standalone";
    import "vis-timeline/styles/vis-timeline-graph2d.css";
    import type { TimelineItem, TimelineGroup, TimelineItemInternal } from "$lib/types";

    // 定义回调函数的类型
    type TimelineCallback<T> = (item: T | null) => void;
    type TimelineHandler = (item: TimelineItem, callback: TimelineCallback<TimelineItem>) => void;

    const props = $props<{
        zoomMin?: number;
        zoomMax?: number;
        start?: Date;
        end?: Date;
        items?: TimelineItem[];
        groups?: TimelineGroup[];
        onAdd?: TimelineHandler;
        onMove?: TimelineHandler;
        onMoving?: TimelineHandler;
        onUpdate?: TimelineHandler;
        onRemove?: TimelineHandler;
    }>();

    // 默认配置
    const DEFAULT_CONFIG = {
        ZOOM_MIN: 1000 * 60 * 1, // 1分钟
        ZOOM_MAX: 1000 * 60 * 60 * 24 * 1.5, // 1.5天
        START: new Date(new Date().setHours(new Date().getHours() - 3)), // 当前时间前3小时
        END: new Date(new Date().setHours(new Date().getHours() + 3)), // 当前时间后3小时
    } as const;

    // 组件状态
    let timeline: Timeline;
    let container: HTMLElement;
    let resetTimeout: number | undefined;
    let itemsDataSet: DataSet<TimelineItemInternal>;
    let groupsDataSet: DataSet<TimelineGroup> | undefined;

    // Handlebars 模板
    const template = Handlebars.compile(`
        <div class="gantt-item {{className}}">
            <div class="gantt-item-title">{{content}}</div>
            {{#if tags}}
            <div class="gantt-item-tags">
                {{#each tags}}<span class="gantt-item-tag">{{this}}</span>{{/each}}
            </div>
            {{/if}}
        </div>
    `);

    // 数据转换函数
    function convertToInternalItem(item: TimelineItem): TimelineItemInternal {
        return {
            ...item,
            content: template({
                content: item.content,
                tags: item.tags,
                className: item.className
            }),
            _raw: {
                content: item.content,
                tags: item.tags
            }
        };
    }

    function convertToExternalItem(item: TimelineItemInternal): TimelineItem {
        if (!item._raw) {
            throw new Error('Internal item missing _raw data');
        }
        return {
            id: item.id,
            group: item.group,
            content: item._raw.content,
            start: item.start,
            end: item.end,
            tags: item._raw.tags,
            className: item.className
        };
    }

    // 创建事件处理器
    function createEventHandler(handler?: TimelineHandler) {
        if (!handler) return undefined;

        return (item: TimelineItemInternal, callback: TimelineCallback<TimelineItemInternal>) => {
            handler(
                convertToExternalItem(item),
                (resultItem: TimelineItem | null) =>
                    callback(resultItem ? convertToInternalItem(resultItem) : null)
            );
        };
    }

    onMount(() => {
        // 初始化数据集
        itemsDataSet = new DataSet((props.items || []).map(convertToInternalItem));
        groupsDataSet = props.groups?.length ? new DataSet(props.groups) : undefined;

        // Timeline 配置
        const options: TimelineOptions = {
            height: "400px",
            groupEditable: true,
            editable: {
                add: false,
                updateTime: true,
                updateGroup: true,
                remove: true,
                overrideItems: false,
            },
            selectable: true,
            multiselect: true,
            itemsAlwaysDraggable: { item: true, range: true },
            zoomMin: props.zoomMin ?? DEFAULT_CONFIG.ZOOM_MIN,
            zoomMax: props.zoomMax ?? DEFAULT_CONFIG.ZOOM_MAX,
            start: props.start ?? DEFAULT_CONFIG.START,
            end: props.end ?? DEFAULT_CONFIG.END,
            showCurrentTime: true,
            format: {
                minorLabels: {
                    minute: "HH:mm",
                    hour: "HH",
                    weekday: "MM/DD",
                    day: "MM/DD",
                },
                majorLabels: {
                    second: "HH:mm:ss",
                    minute: "HH:mm",
                    hour: "MM/DD",
                    weekday: "YYYY",
                    day: "YYYY",
                    week: "YYYY",
                    month: "YYYY",
                    year: "",
                },
            },
            rollingMode: { follow: true, offset: 0.5 },
            // 事件处理
            onAdd: createEventHandler(props.onAdd),
            onMove: createEventHandler(props.onMove),
            onMoving: createEventHandler(props.onMoving),
            onUpdate: createEventHandler(props.onUpdate),
            onRemove: createEventHandler(props.onRemove),
        };

        // 初始化 Timeline
        timeline = new Timeline(container, itemsDataSet, groupsDataSet, options);

        // 添加时间窗口重置
        timeline.on("rangechanged", () => {
            if (resetTimeout) window.clearTimeout(resetTimeout);
            resetTimeout = window.setTimeout(checkTimeWindow, 3000);
        });
    });

    // 检查时间窗口
    function checkTimeWindow() {
        const window = timeline.getWindow();
        const currentTime = new Date();

        if (currentTime < window.start || currentTime > window.end) {
            timeline.setWindow(
                DEFAULT_CONFIG.START,
                DEFAULT_CONFIG.END,
                { animation: { duration: 500, easingFunction: "easeOutQuad" }}
            );
        }
    }

    // 数据同步
    $effect(() => {
        if (!itemsDataSet || !props.items) return;

        const currentIds = new Set(itemsDataSet.getIds());
        props.items.forEach(item => {
            const internalItem = convertToInternalItem(item);
            currentIds.has(item.id)
                ? itemsDataSet.update(internalItem)
                : itemsDataSet.add(internalItem);
            currentIds.delete(item.id);
        });

        currentIds.forEach(id => itemsDataSet.remove(id));
    });

    $effect(() => {
        if (!groupsDataSet || !props.groups) return;

        const currentIds = new Set(groupsDataSet.getIds());
        props.groups.forEach(group => {
            currentIds.has(group.id)
                ? groupsDataSet.update(group)
                : groupsDataSet.add(group);
            currentIds.delete(group.id);
        });

        currentIds.forEach(id => groupsDataSet.remove(id));
    });

    // 导出的方法 - 直接导出而不是通过对象
    export function setWindow(start: Date, end: Date) {
        timeline?.setWindow(start, end);
    }

    export function clearAll() {
        itemsDataSet?.clear();
        groupsDataSet?.clear();
    }

    export function addItem(item: TimelineItem) {
        itemsDataSet?.add(convertToInternalItem(item));
    }

    export function removeItem(id: string) {
        itemsDataSet?.remove(id);
    }

    export function updateItem(item: TimelineItem) {
        itemsDataSet?.update(convertToInternalItem(item));
    }

    export function addGroup(group: TimelineGroup) {
        groupsDataSet?.add(group);
    }

    export function removeGroup(id: string) {
        groupsDataSet?.remove(id);
    }

    export function updateGroup(group: Partial<TimelineGroup> & { id: string }) {
        groupsDataSet?.update(group);
    }

    export function getAllItems(): TimelineItem[] {
        return itemsDataSet?.get().map(convertToExternalItem) ?? [];
    }

    export function getAllGroups(): TimelineGroup[] {
        return groupsDataSet?.get() ?? [];
    }

    onDestroy(() => {
        if (resetTimeout) window.clearTimeout(resetTimeout);
        if (timeline) timeline.destroy();
    });
</script>

<div bind:this={container} />

<style>
    div {
        width: 100%;
        height: 400px;
        margin: 20px 0;
    }
    /* 其他样式保持不变... */
</style>
