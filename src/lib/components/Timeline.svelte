<script lang="ts">
    import Handlebars from "handlebars";
    import { onMount, onDestroy } from "svelte";
    import { Timeline, DataSet, type TimelineOptions } from "vis-timeline/standalone";
    import "vis-timeline/styles/vis-timeline-graph2d.css";
    import type { TimelineItem, TimelineGroup, TimelineItemInternal } from "$lib/types";

    const props = $props<{
        zoomMin?: number;
        zoomMax?: number;
        start?: Date;
        end?: Date;
        items?: TimelineItem[];
        groups?: TimelineGroup[];
        onAdd?: (item: TimelineItem, callback: (item: TimelineItem | null) => void) => void;
        onMove?: (item: TimelineItem, callback: (item: TimelineItem | null) => void) => void;
        onMoving?: (item: TimelineItem, callback: (item: TimelineItem) => void) => void;
        onUpdate?: (item: TimelineItem, callback: (item: TimelineItem | null) => void) => void;
        onRemove?: (item: TimelineItem, callback: (item: TimelineItem | null) => void) => void;
    }>();

    // 默认值
    const DEFAULT_ZOOM_MIN = 1000 * 60 * 1; // 15 分钟
    const DEFAULT_ZOOM_MAX = 1000 * 60 * 60 * 24 * 1.5; // 1.5 天

    // const DEFAULT_START = new Date(new Date().setHours(0, 0, 0, 0));
    // DEFAULT_START 为当前时间剪去 3 小时
    const DEFAULT_START = new Date(new Date().setHours(new Date().getHours() - 3));

    // DEFAULT_END 为当前时间加上 3 小时
    const DEFAULT_END = new Date(new Date().setHours(new Date().getHours() + 3));

    let timeline: Timeline;
    let container: HTMLElement;
    let resetTimeout: number | undefined;
    let itemsDataSet: DataSet<TimelineItemInternal>;
    let groupsDataSet: DataSet<TimelineGroup> | undefined;

    let ganttItemTemplate: string = `
        <div class="gantt-item {{className}}">
            <div class="gantt-item-title">{{content}}</div>
            {{#if tags}}
            <div class="gantt-item-tags">
                {{#each tags}}
                <span class="gantt-item-tag">{{this}}</span>
                {{/each}}
            </div>
            {{/if}}
        </div>
    `;
    const template = Handlebars.compile(ganttItemTemplate);

    // 检查并重置时间线的函数
    const checkAndResetTimeline = () => {
        const window = timeline.getWindow();
        const currentTime = new Date();

        if (currentTime < window.start || currentTime > window.end) {
            timeline.setWindow(DEFAULT_START, DEFAULT_END, {
                animation: {
                    duration: 500,
                    easingFunction: "easeOutQuad",
                },
            });
        }
    };

    // 转换 TimelineItem 到 TimelineItemInternal
    function convertToInternalItem(item: TimelineItem): TimelineItemInternal {
        // 使用 handlebars 模板渲染内容
        const renderedContent = template({
            content: item.content,
            tags: item.tags,
            className: item.className
        });

        return {
            ...item,
            content: renderedContent,
            // 存储原始数据，用于转换回 TimelineItem
            _raw: {
                content: item.content,
                tags: item.tags
            }
        };
    }

    // 转换 TimelineItemInternal 回 TimelineItem
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

    onMount(() => {
        // 转换初始数据
        const internalItems = (props.items || []).map(convertToInternalItem);
        itemsDataSet = new DataSet(internalItems);

        // 只在有 groups 数据时才创建和使用 groupsDataSet
        const groups = props.groups || [];
        groupsDataSet = groups.length > 0 ? new DataSet(groups) : undefined;

        // 配置选项
        const options: TimelineOptions = {
            height: "400px",
            groupEditable: true,
            editable: {
                add: false, // add new items by double tapping
                updateTime: true, // drag items horizontally
                updateGroup: true, // drag items from one group to another
                remove: true, // delete an item by tapping the delete button top right
                overrideItems: false, // allow these options to override item.editable
            },
            selectable: true,
            multiselect: true,
            itemsAlwaysDraggable: {
                item: true,
                range: true,
            },
            zoomMin: props.zoomMin ?? DEFAULT_ZOOM_MIN,
            zoomMax: props.zoomMax ?? DEFAULT_ZOOM_MAX,
            start: props.start ?? DEFAULT_START,
            end: props.end ?? DEFAULT_END,
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
            rollingMode: {
                follow: true,
                offset: 0.5,
            },
            onAdd: props.onAdd ?
                (item: TimelineItemInternal, callback) => {
                    props.onAdd!(
                        convertToExternalItem(item),
                        (resultItem) => callback(resultItem ? convertToInternalItem(resultItem) : null)
                    );
                } : undefined,
            onMove: props.onMove ?
                (item: TimelineItemInternal, callback) => {
                    props.onMove!(
                        convertToExternalItem(item),
                        (resultItem) => callback(resultItem ? convertToInternalItem(resultItem) : null)
                    );
                } : undefined,
            onMoving: props.onMoving ?
                (item: TimelineItemInternal, callback) => {
                    props.onMoving!(
                        convertToExternalItem(item),
                        (resultItem) => callback(resultItem ? convertToInternalItem(resultItem) : null)
                    );
                } : undefined,
            onUpdate: props.onUpdate ?
                (item: TimelineItemInternal, callback) => {
                    props.onUpdate!(
                        convertToExternalItem(item),
                        (resultItem) => callback(resultItem ? convertToInternalItem(resultItem) : null)
                    );
                } : undefined,
            onRemove: props.onRemove ?
                (item: TimelineItemInternal, callback) => {
                    props.onRemove!(
                        convertToExternalItem(item),
                        (resultItem) => callback(resultItem ? convertToInternalItem(resultItem) : null)
                    );
                } : undefined,
        };

        // 初始化时间线，只在有 groups 时传入 groupsDataSet
        timeline = new Timeline(
            container,
            itemsDataSet,
            // @ts-ignore
            groupsDataSet,
            options
        );

        // 添加带防抖效果的 rangechanged 事件监听
        timeline.on("rangechanged", (event) => {
            // 清除之前的定时器
            if (resetTimeout) {
                window.clearTimeout(resetTimeout);
            }

            // 设置新的定时器，3 秒后执行重置检查
            resetTimeout = window.setTimeout(() => {
                checkAndResetTimeline();
            }, 3000);
        });
    });

    // 监听外部 items 变化
    $effect(() => {
        if (itemsDataSet && props.items) {
            const currentIds = new Set(itemsDataSet.getIds());
            props.items.forEach((item: TimelineItem) => {
                const internalItem = convertToInternalItem(item);
                if (currentIds.has(item.id)) {
                    itemsDataSet.update(internalItem);
                } else {
                    itemsDataSet.add(internalItem);
                }
                currentIds.delete(item.id);
            });

            currentIds.forEach((id) => {
                itemsDataSet.remove(id);
            });
        }
    });

    // 监听外部 groups 变化
    $effect(() => {
        if (groupsDataSet && props.groups) {
            const currentIds = new Set(groupsDataSet.getIds());

            props.groups.forEach((group: TimelineGroup) => {
                if (currentIds.has(group.id)) {
                    groupsDataSet?.update(group);
                } else {
                    groupsDataSet?.add(group);
                }
                currentIds.delete(group.id);
            });

            currentIds.forEach((id) => {
                groupsDataSet?.remove(id);
            });
        }
    });

    // 暴露设置时间窗口的方法
    export function setWindow(start: Date, end: Date) {
        timeline.setWindow(start, end);
    }

    export function clearAll() {
        itemsDataSet.clear();
        groupsDataSet?.clear();
    }

    // 暴露添加单个项目的方法
    export function addItem(item: TimelineItem) {
        if (itemsDataSet) {
            itemsDataSet.add(convertToInternalItem(item));
        }
    }

    // removeItem
    export function removeItem(id: number | string) {
        if (itemsDataSet) {
            itemsDataSet.remove(id);
        }
    }

    // 暴露添加组的方法
    export function addGroup(group: TimelineGroup) {
        if (groupsDataSet) {
            groupsDataSet.add(group);
        }
    }

    // 暴露删除组的方法
    export function removeGroup(id: number | string) {
        if (groupsDataSet) {
            groupsDataSet.remove(id);
        }
    }

    // 暴露更新组的方法
    export function updateGroup(group: Partial<TimelineGroup> & { id: number | string }) {
        if (groupsDataSet) {
            groupsDataSet.update(group);
        }
    }

    // 暴露获取所有 items 的方法
    export function getAllItems(): TimelineItem[] {
        if (itemsDataSet) {
            return itemsDataSet.get().map(convertToExternalItem);
        }
        return [];
    }

    // 暴露获取所有 groups 的方法
    export function getAllGroups(): TimelineGroup[] {
        if (groupsDataSet) {
            return groupsDataSet.get();
        }
        return [];
    }

    // 添加更新项目的方法
    export function updateItem(item: TimelineItem) {
        if (itemsDataSet) {
            itemsDataSet.update(convertToInternalItem(item));
        }
    }

    // 组件销毁时清理事件监听和定时器
    onDestroy(() => {
        if (resetTimeout) {
            window.clearTimeout(resetTimeout);
        }
        if (timeline) {
            timeline.destroy();
        }
    });
</script>

<div bind:this={container}></div>

<style>
    /* https://visjs.github.io/vis-timeline/examples/timeline/styling/customCss.html */
    /* https://github.com/A-Safdar/socs-theme-playground/blob/106a8b4af3b9411d3aabdc7246ec617ca4ff64df/src/SchoolsSports.Theme/wwwroot/themes/schools-sports/plugins/global/plugins.bundle.css#L736 */

    div {
        width: 100%;
        height: 400px;
        margin: 20px 0;
    }

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
</style>
