<script lang="ts">
    import Handlebars from "handlebars";
    import { onMount, onDestroy } from "svelte";
    import { Timeline, DataSet, type TimelineOptions } from "vis-timeline/standalone";
    import "vis-timeline/styles/vis-timeline-graph2d.css";
    import type { TimelineItem, TimelineItemInternal } from "$lib/types";
    import { t } from "svelte-i18n";

    type TimelineCallback<T> = (item: T | null) => void;
    type TimelineHandler = (item: TimelineItem, callback: TimelineCallback<TimelineItem>) => void;

    const props = $props<{
        zoomMin?: number;
        zoomMax?: number;
        start?: Date;
        end?: Date;
        items?: TimelineItem[];
        onAdd?: TimelineHandler;
        onMove?: TimelineHandler;
        onMoving?: TimelineHandler;
        onUpdate?: TimelineHandler;
        onRemove?: TimelineHandler;
    }>();

    const DEFAULT_CONFIG = {
        ZOOM_MIN: 1000 * 60 * 1,
        ZOOM_MAX: 1000 * 60 * 60 * 24 * 1.5,
        START: new Date(new Date().setHours(new Date().getHours() - 3)),
        END: new Date(new Date().setHours(new Date().getHours() + 3)),
    } as const;

    let timeline: Timeline;
    let container: HTMLElement;
    let resetTimeout: number | undefined;
    let itemsDataSet: DataSet<TimelineItemInternal>;
    // let groupsDataSet: DataSet<TimelineGroup>;

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
        return new Date(date).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    });

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

    function convertToInternalItem(item: TimelineItem): TimelineItemInternal {
        // console.log(">>>>> item", item);
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
        // if item._raw is not exist, create one, it may be added by double click
        if (!item.end && item.content == "new item") {
            // if end is not exist, set it to start + 2 hours
            item.content = `#${$t("app.timeline.newTaskTitle")}`;
            item.end = new Date(item.start.getTime() + 2 * 60 * 60 * 1000);
            // set to blue
            item.className = "blue";
        }
        if (!item._raw) {
            item._raw = {
                content: item.content,
                tags: [],
            };
        }
        // convert content and tags from _raw to item
        let ret: TimelineItem = {
            ...item,
            content: item._raw.content,
            tags: item._raw.tags,
        };
        return ret;
    }

    // create event handler
    function createEventHandler(handler?: TimelineHandler) {
        if (!handler) return undefined;

        return (item: any, callback: TimelineCallback<any>) => {
            handler(convertToExternalItem(item), (resultItem: TimelineItem | null) =>
                callback(resultItem ? convertToInternalItem(resultItem) : null)
            );
        };
    }

    const BATCH_SIZE = 100; // batch size
    const DEBOUNCE_DELAY = 200; // debounce delay (ms)

    function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
        let timeoutId: number;
        return (...args: Parameters<T>) => {
            if (timeoutId) window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => fn(...args), delay);
        };
    }

    onMount(() => {
        // init data set
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
            rollingMode: { follow: false, offset: 0.5 },
            orientation: "top",
            tooltipOnItemUpdateTime: {
                template: function (item: TimelineItemInternal) {
                    return tooltipTemplate({
                        start: item.start,
                        end: item.end,
                    });
                },
            },

            onAdd: createEventHandler(props.onAdd),
            onMove: createEventHandler(props.onMove),
            onMoving: createEventHandler(props.onMoving),
            onUpdate: createEventHandler(props.onUpdate),
            onRemove: createEventHandler(props.onRemove),
            xss: {
                disabled: true,
            },

            min: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
            max: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),

            groupOrder: "content",
        };

        // init timeline
        timeline = new Timeline(container, itemsDataSet, options);

        // add time window reset timer
        // timeline.on("rangechanged", () => {
        //     if (resetTimeout) window.clearTimeout(resetTimeout);
        //     resetTimeout = window.setTimeout(debouncedCheckTimeWindow, 3000);
        // });

        // add timeline event listener
        // keyboard event depends on select event
        timeline.on("select", function (properties: { items: (string | number)[] }) {
            if (!properties.items || properties.items.length === 0) return;

            const selectedId = properties.items[0];
            const selectedItem = itemsDataSet.get(selectedId);
            if (selectedItem) {
                // find corresponding DOM element and set focus
                const element = container.querySelector(`[data-item-id="${selectedId}"]`);
                if (element instanceof HTMLElement) {
                    element.focus();
                }
            }
        });

        // rangechanged, since rangechanged event is triggered frequently, once per second
        // timeline.on("rangechanged", function (event: any) {
        //     console.log(">>>>> rangechanged", event);
        // });

        // listen on container
        container.addEventListener("keydown", handleKeyDown);
    });

    // check time window
    function checkTimeWindow() {
        const window = timeline.getWindow();
        const currentTime = new Date();

        if (currentTime < window.start || currentTime > window.end) {
            timeline.setWindow(DEFAULT_CONFIG.START, DEFAULT_CONFIG.END, {
                animation: { duration: 500, easingFunction: "easeOutQuad" },
            });
        }
    }

    // optimize checkTimeWindow function, add debounce
    const debouncedCheckTimeWindow = debounce(checkTimeWindow, DEBOUNCE_DELAY);

    // data sync
    $effect(() => {
        if (!itemsDataSet || !props.items) return;

        const currentIds = new Set(itemsDataSet.getIds());
        const updates: TimelineItemInternal[] = [];
        const adds: TimelineItemInternal[] = [];
        const removes: string[] = [];

        // collect items to update and add
        props.items.forEach((item: TimelineItem) => {
            const internalItem = convertToInternalItem(item);
            if (currentIds.has(item.id)) {
                updates.push(internalItem);
            } else {
                adds.push(internalItem);
            }
            currentIds.delete(item.id);
        });

        // collect items to remove
        currentIds.forEach((id) => removes.push(id.toString()));

        // batch update
        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            const batch = updates.slice(i, i + BATCH_SIZE);
            itemsDataSet.update(batch);
        }

        // batch add
        for (let i = 0; i < adds.length; i += BATCH_SIZE) {
            const batch = adds.slice(i, i + BATCH_SIZE);
            itemsDataSet.add(batch);
        }

        // batch remove
        for (let i = 0; i < removes.length; i += BATCH_SIZE) {
            const batch = removes.slice(i, i + BATCH_SIZE);
            itemsDataSet.remove(batch);
        }
    });

    // export methods - directly export instead of through object
    export function setWindow(start: Date, end: Date) {
        console.log("[Timeline] set window range: ", start, end);
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

    // optimize export methods, add batch processing
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

    // add keyboard event handler
    function handleKeyDown(event: KeyboardEvent) {
        const target = event.target as HTMLElement;
        // Returns the first (starting at element) inclusive ancestor that matches selectors, and null otherwise.
        const ganttItem = target.closest(".gantt-item") as HTMLElement;
        if (!ganttItem) return;

        // stop event bubbling and default behavior
        event.stopPropagation();
        event.preventDefault();
        //
        const itemId = ganttItem.dataset.itemId;
        if (!itemId) return;

        // console.log(">>>>> onKeyDown event", event, "item id:", itemId);

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
    /* timeline container style */
    :global(.vis-timeline) {
        contain: content; /* enable content isolation, improve rendering performance */
        will-change: transform; /* hint browser that transform is coming */
        border: 1px solid var(--border) !important;
        border-radius: var(--radius) !important;
        @apply bg-background;
    }

    /* label set style */
    :global(.vis-timeline .vis-labelset .vis-label) {
        display: flex;
        align-items: center;
        /* padding-left: 1rem; */
        /* padding-right: 1rem; */
        border-bottom: none;
        font-size: 1.25rem;
        font-weight: 500;
    }

    /* foreground group style */
    :global(.vis-timeline .vis-foreground .vis-group) {
        border-bottom: none;
    }

    /* timeline item style */
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

    /* timeline item content style */
    :global(.vis-timeline .vis-item .vis-item-content) {
        padding: 0.75rem 1rem;
        width: 100%;
        transform: none !important;
    }

    /* timeline time axis style */
    :global(.vis-timeline .vis-time-axis) {
        font-size: 0.95rem;
        text-transform: uppercase;
        font-weight: 500;
    }

    /* time axis text style */
    :global(.vis-timeline .vis-time-axis .vis-text) {
        @apply text-muted-foreground;
    }

    /* time axis minor grid line style */
    :global(.vis-timeline .vis-time-axis .vis-grid.vis-minor) {
        @apply border-gray-300;
    }

    /* time axis vertical grid line style */
    :global(.vis-timeline .vis-time-axis .vis-grid.vis-vertical) {
        border-left-style: dashed !important;
    }

    /* remove panel shadow */
    :global(.vis-timeline .vis-panel .vis-shadow) {
        box-shadow: none !important;
    }

    /* panel border color */
    :global(
            .vis-timeline .vis-panel.vis-bottom,
            .vis-timeline .vis-panel.vis-center,
            .vis-timeline .vis-panel.vis-left,
            .vis-timeline .vis-panel.vis-right,
            .vis-timeline .vis-panel.vis-top
        ) {
        border-color: var(--border) !important;
    }

    /* current time indicator style */
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

    /* major tick text (date) */
    /* :global(.vis-time-axis .vis-text.vis-major) {
        font-weight: bold;
    } */

    /* minor tick (hour, minute) */
    /* :global(.vis-time-axis .vis-grid.vis-minor) {
        border-color: transparent;
    } */

    /* major tick (date) */
    /* :global(.vis-time-axis .vis-grid.vis-major) {
        border-color: orange;
    } */

    /* today date background color */
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
        /* add shadow */
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1) !important;
    }

    :global(.gantt-item) {
        height: 32px;
        display: flex;
        align-items: center;
        cursor: pointer;
        outline: none;
        user-select: none; /* prevent text selection affect focus */
        -webkit-user-select: none;
    }

    /* add focus background color */
    /* :global(.gantt-item:focus) {
        outline: 2px solid var(--primary);
        outline-offset: -2px;
        border-radius: var(--radius);
        background-color: rgba(0, 0, 0, 0.05);
    } */

    /* focus hover effect */
    /* :global(.gantt-item:focus:hover) {
        background-color: rgba(0, 0, 0, 0.08);
    } */

    /* hover effect */
    /* :global(.gantt-item:hover) {
        background-color: rgba(0, 0, 0, 0.05);
    } */

    /* font size */
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
        /* add shadow */
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1) !important;
        /* background color, 80% transparent */
        background: #262626 !important;
        width: 160px;
        padding: 1px;
    }

    /* loading style */
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
