<script lang="ts">
    import Handlebars from "handlebars";
    import { onMount, onDestroy } from "svelte";
    import { Tags } from "lucide-svelte";
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
        <div class="gantt-item" tabindex="0" role="button" data-item-id="{{id}}">
            <div class="gantt-item-content">
                    <div class="flex items-center gap-1">
                        <div class="gantt-item-title">{{content}}</div>
                        <div class="gantt-item-date">({{formatDateRange start end}})</div>
                    </div>
                    {{#if tags}}
                        <div class="gantt-item-tags flex  gap-1">
                            <span class="inline-block text-sm">🏷️</span>
                            {{#each tags}}
                                <span class="gantt-item-tag">{{this}}</span>{{#unless @last}} <span class="gantt-item-tag">,</span> {{/unless}}
                            {{/each}}
                        </div>
                    {{/if}}
            </div>
        </div>
    `);
    // 实现一个 tooltip 的模板
    // 内 item 的 start 和 end
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
            id: item.id,
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
        // 如果 item._raw 不存在，则创建一个, 可能是双击添加的
        if (!item.end && item.content == "new item") {
            // 如果 end 不存在，则设置为 start + 2 小时
            item.content = "#新任务";
            item.end = new Date(item.start.getTime() + 2 * 60 * 60 * 1000);
            // 设置为蓝色
            item.className = "blue";
        }
        if (!item._raw) {
            item._raw = {
                content: item.content,
                tags: [],
            };
        }
        // 将 _raw 中的 content 和 tags 转换为 item 的 content 和 tags
        let ret: TimelineItem = {
            ...item,
            content: item._raw.content,
            tags: item._raw.tags,
        };
        return ret;
    }

    // 创建事处理器
    function createEventHandler(handler?: TimelineHandler) {
        if (!handler) return undefined;

        return (item: any, callback: TimelineCallback<any>) => {
            handler(convertToExternalItem(item), (resultItem: TimelineItem | null) =>
                callback(resultItem ? convertToInternalItem(resultItem) : null)
            );
        };
    }

    // 在 script 标签开始处添加批量处理相关的常量
    const BATCH_SIZE = 100; // 批量处理的数量
    const DEBOUNCE_DELAY = 200; // 防抖延迟时间 (ms)

    // 添加防抖函数
    function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
        let timeoutId: number;
        return (...args: Parameters<T>) => {
            if (timeoutId) window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => fn(...args), delay);
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
                add: true,
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
            // 添加数据加载策略
            // loadingScreenTemplate: function () {
            //     return '<div class="loading-screen">加载中...</div>';
            // },

            // 限制可见范围
            min: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), // 最多显示一年前的数据
            max: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 最多显示一年后的数据

            // 添加分组策略
            groupOrder: "content", // 按内容排序

            // 添加虚拟滚动配置
            verticalScroll: true,
            horizontalScroll: true,
            zoomKey: "ctrlKey",

            // 优化渲染性能
            // throttleRedraw: 16, // 限重绘频率 (ms)
        };

        // 初始化 Timeline
        timeline = new Timeline(container, itemsDataSet, options);

        // 添加时间窗口重置定时器
        // timeline.on("rangechanged", () => {
        //     if (resetTimeout) window.clearTimeout(resetTimeout);
        //     resetTimeout = window.setTimeout(debouncedCheckTimeWindow, 3000);
        // });

        // 添加 Timeline 事件监听
        // 键盘事件依赖于 select 事件
        timeline.on("select", function (properties: { items: (string | number)[] }) {
            if (!properties.items || properties.items.length === 0) return;

            const selectedId = properties.items[0];
            const selectedItem = itemsDataSet.get(selectedId);
            if (selectedItem) {
                // 找到对应的 DOM 元素并设置焦点
                const element = container.querySelector(`[data-item-id="${selectedId}"]`);
                if (element instanceof HTMLElement) {
                    element.focus();
                }
            }
        });

        // rangechanged, 由于 rangechanged 事件会频繁触发，1s 内触发一次
        // timeline.on("rangechanged", function (event: any) {
        //     console.log(">>>>> rangechanged", event);
        // });

        // 直接在容器上监听事件，使用事件委托
        container.addEventListener("keydown", handleKeyDown);
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

    // 优化 checkTimeWindow 函数，添加防抖
    const debouncedCheckTimeWindow = debounce(checkTimeWindow, DEBOUNCE_DELAY);

    // 数据同步
    $effect(() => {
        if (!itemsDataSet || !props.items) return;

        const currentIds = new Set(itemsDataSet.getIds());
        const updates: TimelineItemInternal[] = [];
        const adds: TimelineItemInternal[] = [];
        const removes: string[] = [];

        // 收集需要更新和添加的项
        props.items.forEach((item: TimelineItem) => {
            const internalItem = convertToInternalItem(item);
            if (currentIds.has(item.id)) {
                updates.push(internalItem);
            } else {
                adds.push(internalItem);
            }
            currentIds.delete(item.id);
        });

        // 收集需要删除的项
        currentIds.forEach((id) => removes.push(id.toString()));

        // 批量处理更新
        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            const batch = updates.slice(i, i + BATCH_SIZE);
            itemsDataSet.update(batch);
        }

        // 批量处理添加
        for (let i = 0; i < adds.length; i += BATCH_SIZE) {
            const batch = adds.slice(i, i + BATCH_SIZE);
            itemsDataSet.add(batch);
        }

        // 批量处理删除
        for (let i = 0; i < removes.length; i += BATCH_SIZE) {
            const batch = removes.slice(i, i + BATCH_SIZE);
            itemsDataSet.remove(batch);
        }
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

    // 优化导出方法，添加量处理
    export function addItems(items: TimelineItem[]) {
        if (!itemsDataSet) return;

        const internalItems = items.map(convertToInternalItem);
        for (let i = 0; i < internalItems.length; i += BATCH_SIZE) {
            const batch = internalItems.slice(i, i + BATCH_SIZE);
            itemsDataSet.add(batch);
        }
    }

    export function removeItems(ids: string[]) {
        if (!itemsDataSet) return;

        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            const batch = ids.slice(i, i + BATCH_SIZE);
            itemsDataSet.remove(batch);
        }
    }

    // 添加键盘事件处理函数
    function handleKeyDown(event: KeyboardEvent) {
        const target = event.target as HTMLElement;
        // Returns the first (starting at element) inclusive ancestor that matches selectors, and null otherwise.
        const ganttItem = target.closest(".gantt-item") as HTMLElement;
        if (!ganttItem) return;

        // 阻止事件冒泡和默认行为
        event.stopPropagation();
        event.preventDefault();
        //
        const itemId = ganttItem.dataset.itemId;
        if (!itemId) return;

        console.log(">>>>> onKeyDown event", event, "item id:", itemId);

        const item = itemsDataSet.get(itemId);
        if (!item) return;

        switch (event.key) {
            case "Delete":
            case "Backspace":
                if (props.onRemove) {
                    props.onRemove(convertToExternalItem(item), (resultItem: TimelineItem | null) => {
                        if (resultItem) {
                            itemsDataSet.remove(convertToInternalItem(resultItem));
                        }
                    });
                }
                break;
            case "Enter":
            case " ":
                if (props.onUpdate) {
                    props.onUpdate(convertToExternalItem(item), (resultItem: TimelineItem | null) => {
                        if (resultItem) {
                            itemsDataSet.update(convertToInternalItem(resultItem));
                        }
                    });
                }
                break;
        }
    }

    onDestroy(() => {
        if (resetTimeout) window.clearTimeout(resetTimeout);
        if (timeline) {
            timeline.destroy();
        }
        // 移除容器级别的事件监听器清理;
        if (container) {
            container.removeEventListener("keydown", handleKeyDown);
        }
    });
</script>

<div class="w-full h-[300px]" bind:this={container}></div>

<style>
    /* 时间线容器样式 */
    :global(.vis-timeline) {
        contain: content; /* 开启内容隔离，提升渲染性能 */
        will-change: transform; /* 提示浏览器即将进行变换 */
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
        contain: layout;
        will-change: transform;
        position: absolute;
        border-width: 1px;
        border-radius: var(--radius) !important;
    }

    :global(.vis-timeline .vis-item.vis-item.blue) {
        @apply bg-blue-300 text-foreground border-blue-300;
    }

    :global(.vis-timeline .vis-item.vis-item.yellow) {
        @apply bg-yellow-300 text-foreground border-yellow-300;
    }

    :global(.vis-timeline .vis-item.vis-item.red) {
        @apply bg-red-300 text-foreground border-red-300;
    }

    :global(.vis-timeline .vis-item.vis-item.green) {
        @apply bg-green-300 text-foreground border-green-300;
    }

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

    /* 时轴文本样式 */
    :global(.vis-timeline .vis-time-axis .vis-text) {
        @apply text-muted-foreground;
    }

    /* 时轴次要网格线样式 */
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
    /* background: var(--destructive); */
    /* :global(.vis-time-axis .vis-grid.vis-today) {

        @apply bg-neutral-100;
    } */
    /* .vis-rolling-mode-btn */
    :global(.vis-rolling-mode-btn) {
        @apply bg-blue-300;
    }
    /* .vis-timeline .vis-item .vis-item-content */
    :global(.vis-timeline .vis-item .vis-item-content) {
        padding: 0.5rem 0.75rem;
    }
    /* .vis-editable.vis-selected */
    :global(.vis-editable.vis-selected) {
        /* 添加阴影 */
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1) !important;
    }

    :global(.gantt-item) {
        height: 32px;
        display: flex;
        align-items: center;
        cursor: pointer;
        outline: none;
        user-select: none; /* 防止文本选择影响焦点 */
        -webkit-user-select: none;
    }

    /* 添加焦点背景色 */
    /* :global(.gantt-item:focus) {
        outline: 2px solid var(--primary);
        outline-offset: -2px;
        border-radius: var(--radius);
        background-color: rgba(0, 0, 0, 0.05);
    } */

    /* 焦点时的悬停效果 */
    /* :global(.gantt-item:focus:hover) {
        background-color: rgba(0, 0, 0, 0.08);
    } */

    /* 添加悬停效果 */
    /* :global(.gantt-item:hover) {
        background-color: rgba(0, 0, 0, 0.05);
    } */

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

    /* 添加加载中的样式 */
    :global(.loading-screen) {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 1rem;
        background: rgba(255, 255, 255, 0.8);
        border-radius: var(--radius);
        z-index: 1000;
    }
</style>
