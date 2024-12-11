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
        // groups?: TimelineGroup[];
        onAdd?: TimelineHandler;
        onMove?: TimelineHandler;
        onMoving?: TimelineHandler;
        onUpdate?: TimelineHandler;
        onRemove?: TimelineHandler;
    }>();

    // 默认配置
    const DEFAULT_CONFIG = {
        ZOOM_MIN: 1000 * 60 * 1, // 1 分钟
        ZOOM_MAX: 1000 * 60 * 60 * 24 * 1.5, // 1.5 天
        START: new Date(new Date().setHours(new Date().getHours() - 3)), // 当前时间前 3 小时
        END: new Date(new Date().setHours(new Date().getHours() + 3)), // 当前时间后 3 小时
    } as const;

    // 组件状态
    let timeline: Timeline;
    let container: HTMLElement;
    let resetTimeout: number | undefined;
    let itemsDataSet: DataSet<TimelineItemInternal>;
    // let groupsDataSet: DataSet<TimelineGroup>;

    // Handlebars 模板
    const template = Handlebars.compile(`
        <div class="gantt-item">
            <div class="gantt-item-content">
                    <div class="flex items-center gap-1">
                        <div class="gantt-item-title">{{content}}</div>
                        <div class="gantt-item-date">({{formatDateRange start end}})</div>
                    </div>
                    {{#if tags}}
                        <div class="gantt-item-tags">
                        <span class="gantt-item-tag">tags: </span>
                        {{#each tags}}
                            <span class="gantt-item-tag">{{this}}</span>{{#unless @last}} <span class="gantt-item-tag">,</span> {{/unless}}
                        {{/each}}
                    </div>
                {{/if}}
            </div>
        </div>
    `);
    // 实现一个 tooltip 的模板
    // 内容为 item 的 start 和 end
    const tooltipTemplate = Handlebars.compile(`
        <div class="flex flex-col p-0.5 whitespace-nowrap">
            <div class="flex items-center">
                <span class="pl-1 text-gray-400 mr-2 text-xs">开始时间：</span>
                <span class="text-sm">{{formatDate start}}</span>
            </div>
            <div class="flex items-center">
                <span class="pl-1 text-gray-400 mr-2 text-xs">结束时间：</span>
                <span class="text-sm">{{formatDate end}}</span>
            </div>
        </div>
    `);

    Handlebars.registerHelper("formatDate", function (date) {
        // 格式化日期 11/27 10:00
        return new Date(date).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    });

    // Handlebars 输入 start 和 end ,返回可读性更高的字符串，如 15m, 1.5h, 2d
    Handlebars.registerHelper("formatDateRange", function (start: string, end: string) {
        const diff = new Date(end).getTime() - new Date(start).getTime();
        // 保留一位小数
        const minutes = Math.round((diff / 1000 / 60) * 10) / 10;
        const hours = Math.round((minutes / 60) * 10) / 10;
        const days = Math.round((hours / 24) * 10) / 10;
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    });

    // 数据转换函数
    function convertToInternalItem(item: TimelineItem): TimelineItemInternal {
        console.log(">>>>> item", item);
        const renderedContent = template({
            content: item.content,
            tags: item.tags?.length ? item.tags : null,
            className: item.className,
            start: item.start,
            end: item.end,
        });

        return {
            ...item,
            content: renderedContent,
            _raw: {
                content: item.content,
                tags: item.tags,
            },
        };
    }

    function convertToExternalItem(item: TimelineItemInternal): TimelineItem {
        if (!item._raw) {
            throw new Error("Internal item missing _raw data");
        }
        // 将 _raw 中的 content 和 tags 转换为 item 的 content 和 tags
        let ret: TimelineItem = {
            ...item,
            content: item._raw.content,
            tags: item._raw.tags,
        };
        return ret;
    }

    // 创建事件处理器
    function createEventHandler(handler?: TimelineHandler) {
        if (!handler) return undefined;

        return (item: any, callback: TimelineCallback<any>) => {
            handler(convertToExternalItem(item), (resultItem: TimelineItem | null) =>
                callback(resultItem ? convertToInternalItem(resultItem) : null)
            );
        };
    }

    onMount(() => {
        // 初始化数据集
        itemsDataSet = new DataSet((props.items || []).map(convertToInternalItem));
        // groupsDataSet = props.groups?.length ? new DataSet(props.groups) : new DataSet([]);

        // Timeline 配置
        const options: TimelineOptions = {
            height: "100%",
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
            orientation: "top",
            tooltipOnItemUpdateTime: {
                template: function (item: TimelineItemInternal) {
                    return tooltipTemplate({
                        start: item.start,
                        end: item.end,
                    });
                },
            },
            // 事件处理
            onAdd: createEventHandler(props.onAdd),
            onMove: createEventHandler(props.onMove),
            onMoving: createEventHandler(props.onMoving),
            onUpdate: createEventHandler(props.onUpdate),
            onRemove: createEventHandler(props.onRemove),
            xss: {
                disabled: true,
            },
        };

        // 初始化 Timeline
        timeline = new Timeline(container, itemsDataSet, options);

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
            timeline.setWindow(DEFAULT_CONFIG.START, DEFAULT_CONFIG.END, {
                animation: { duration: 500, easingFunction: "easeOutQuad" },
            });
        }
    }

    // 数据同步
    $effect(() => {
        if (!itemsDataSet || !props.items) return;

        const currentIds = new Set(itemsDataSet.getIds());
        props.items.forEach((item: TimelineItem) => {
            const internalItem = convertToInternalItem(item);
            currentIds.has(item.id) ? itemsDataSet.update(internalItem) : itemsDataSet.add(internalItem);
            currentIds.delete(item.id);
        });

        currentIds.forEach((id) => itemsDataSet.remove(id));
    });

    // 导出的方法 - 直接导出而不是通过对象
    export function setWindow(start: Date, end: Date) {
        timeline?.setWindow(start, end);
    }

    export function clearAll() {
        itemsDataSet?.clear();
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

    export function getAllItems(): TimelineItem[] {
        return itemsDataSet?.get().map(convertToExternalItem) ?? [];
    }

    onDestroy(() => {
        if (resetTimeout) window.clearTimeout(resetTimeout);
        if (timeline) timeline.destroy();
    });
</script>

<div class="w-full my-5 h-[300px]" bind:this={container}></div>

<style>
    /* 时间线容器样式 */
    :global(.vis-timeline) {
        border: 1px solid var(--border) !important;
        border-radius: var(--radius) !important;
        @apply bg-background;
    }

    /* 标签集中的标签样式 */
    :global(.vis-timeline .vis-labelset .vis-label) {
        display: flex;
        align-items: center;
        /* padding-left: 1rem; */
        /* padding-right: 1rem; */
        border-bottom: none;
        font-size: 1.25rem;
        font-weight: 500;
    }

    /* 前景中组的边框样式 */
    :global(.vis-timeline .vis-foreground .vis-group) {
        border-bottom: none;
    }

    /* 时间线项目的基本样式 */
    :global(.vis-timeline .vis-item) {
        position: absolute;
        border-width: 1px;
        border-radius: var(--radius) !important;
        @apply bg-blue-300 text-foreground border-blue-300;
    }

    :global(.vis-item.blue) {
        position: absolute;
        border-width: 1px;
        border-radius: var(--radius) !important;
        @apply bg-blue-300 text-foreground border-blue-300;
    }

    /* yelloW */
    :global(.vis-item.yellow) {
        position: absolute;
        border-width: 1px;
        border-radius: var(--radius) !important;
        @apply bg-yellow-300  text-foreground border-yellow-300;
    }

    /* red */
    :global(.vis-item.red) {
        position: absolute;
        border-width: 1px;
        border-radius: var(--radius) !important;
        @apply bg-red-300  text-foreground border-red-300;
    }

    :global(.vis-item.green) {
        position: absolute;
        border-width: 1px;
        border-radius: var(--radius) !important;
        @apply bg-green-300 text-foreground border-green-300;
    }

    /* 选中状态的时间线项目样式 */
    /* :global(.vis-timeline .vis-item.vis-selected) {
        @apply bg-orange-100 text-foreground bg-orange-200;
    } */

    /* 时间线项目内容样式 */
    :global(.vis-timeline .vis-item .vis-item-content) {
        padding: 0.75rem 1rem;
        width: 100%;
        transform: none !important;
    }

    /* 时间轴样式 */
    :global(.vis-timeline .vis-time-axis) {
        font-size: 0.95rem;
        text-transform: uppercase;
        font-weight: 500;
    }

    /* 时间轴文本样式 */
    :global(.vis-timeline .vis-time-axis .vis-text) {
        @apply text-muted-foreground;
    }

    /* 时间轴次要网格线样式 */
    :global(.vis-timeline .vis-time-axis .vis-grid.vis-minor) {
        @apply border-gray-300;
    }

    /* 时间轴垂直网格线样式 */
    :global(.vis-timeline .vis-time-axis .vis-grid.vis-vertical) {
        border-left-style: dashed !important;
    }

    /* 移除面板阴影 */
    :global(.vis-timeline .vis-panel .vis-shadow) {
        box-shadow: none !important;
    }

    /* 面板边框颜色设置 */
    :global(
            .vis-timeline .vis-panel.vis-bottom,
            .vis-timeline .vis-panel.vis-center,
            .vis-timeline .vis-panel.vis-left,
            .vis-timeline .vis-panel.vis-right,
            .vis-timeline .vis-panel.vis-top
        ) {
        border-color: var(--border) !important;
    }

    /* 当前时间指示器样式 */
    :global(.vis-timeline .vis-current-time) {
        background-color: transparent !important;
        width: 200px !important;
        position: relative !important;
        left: -200px !important;
        background: linear-gradient(
            to right,
            rgba(23, 198, 83, 0) 0%,
            rgba(23, 198, 83, 0.1) 45%,
            rgba(23, 198, 83, 0.2) 99%,
            rgba(23, 198, 83, 1) 100%
        ) !important;
    }

    /* :global(
            .vis-panel.vis-center,
            .vis-panel.vis-left,
            .vis-panel.vis-right,
            .vis-panel.vis-top,
            .vis-panel.vis-bottom
        ) {
        border: 0px solid;
    } */

    /* 主要刻度文字（日期） */
    /* :global(.vis-time-axis .vis-text.vis-major) {
        font-weight: bold;
    } */

    /* 次要刻度（小时、分钟） */
    /* :global(.vis-time-axis .vis-grid.vis-minor) {
        border-color: transparent;
    } */

    /* 主要刻度（日期） */
    /* :global(.vis-time-axis .vis-grid.vis-major) {
        border-color: orange;
    } */

    /* 今天日期背景颜色 */
    :global(.vis-time-axis .vis-grid.vis-today) {
        /* background: var(--destructive); */
        @apply bg-neutral-100;
    }
    /* .vis-rolling-mode-btn */
    :global(.vis-rolling-mode-btn) {
        @apply bg-blue-300;
    }
    /* .vis-timeline .vis-item .vis-item-content */
    :global(.vis-timeline .vis-item .vis-item-content) {
        padding: 0.5rem 0.75rem;
    }

    :global(.gantt-item) {
        /* 固定高度 */
        height: 32px;
        /* 内容水平居中 */
        display: flex;
        align-items: center;
        /* 内容垂直居中 */
        /* justify-content: center; */
    }

    /* 字体大小 */
    :global(.gantt-item-title) {
        font-size: 14px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    :global(.gantt-item-date) {
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    :global(.gantt-item-tags) {
        display: flex;
        gap: 1px;
        flex-wrap: nowrap;
        overflow: hidden;
    }

    :global(.gantt-item-tag) {
        padding: 1px 2px;
        font-weight: 300;
        border-radius: 3px;
        font-size: 11px;
        white-space: nowrap;
    }

    :global(.vis-item .vis-onUpdateTime-tooltip) {
        border-radius: var(--radius) !important;
        /* 添加阴影 */
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1) !important;
        /* 背景颜色，80% 透明度 */
        background: #262626 !important;
        width: 160px;
        padding: 1px;
    }
</style>
