<script lang="ts">
    import TimeProgressBar from "$lib/components/TimeProgressBar.svelte";
    import { listen, type UnlistenFn } from "@tauri-apps/api/event";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import dayjs from "dayjs";
    import { onMount } from "svelte";
    import { getMattersByRange, type Matter } from "../../store";

    let resizeObserver: ResizeObserver | null = null;
    let rootElement: HTMLElement;
    const window = getCurrentWindow();

    let timeSegments: Array<{
        start: number;
        end: number;
        color: string;
    }> = [];

    function setupResizeObserver() {
        if (!rootElement) {
            console.log("rootElement is null");
            return;
        }

        resizeObserver = new ResizeObserver((entries) => updateHeight(true));
        resizeObserver.observe(rootElement);
        console.log("setupResizeObserver");
    }

    async function updateHeight(force: boolean = false) {
        if (!rootElement) {
            console.log("rootElement is null");
            return;
        }

        const newHeight = rootElement.clientHeight;
        await window.emit("time-progress-bar-height", newHeight);
        console.log("update time-progress-bar-height:", newHeight);
    }

    let unlistens: UnlistenFn[] = [];

    let updateInterval: ReturnType<typeof setInterval> | undefined;
    // 设置定时更新
    function setupUpdateInterval() {
        // 立即执行一次
        getTimeProgress();

        // 每分钟更新一次
        updateInterval = setInterval(() => {
            getTimeProgress();
        }, 60 * 1000);
    }

    async function getTimeProgress() {
        // 获取今天的时间范围
        const start = dayjs().startOf("day").toISOString();
        const end = dayjs().endOf("day").toISOString();
        const matters = await getMattersByRange(start, end);

        // 将 Matter 转换为 TimeSegment 格式
        timeSegments = matters.map((matter: Matter) => {
            // 默认颜色为灰色
            let color = "#808080";

            // 根据 reserved_1 设置颜色
            if (matter.reserved_1) {
                switch (matter.reserved_1.toLowerCase()) {
                    case "red":
                        color = "#ff4d4f";
                        break;
                    case "yellow":
                        color = "#faad14";
                        break;
                    case "blue":
                        color = "#1890ff";
                        break;
                    case "green":
                        color = "#52c41a";
                        break;
                }
            }

            return {
                start: new Date(matter.start_time).getTime(),
                end: new Date(matter.end_time).getTime(),
                color: color,
            };
        });

        console.log("转换后的 timeSegments:", timeSegments);
    }

    onMount(() => {
        console.log("onMount");
        setupUpdateInterval();
        setupListeners();
        setupResizeObserver();
        return () => {
            console.log("onMount return");
            unlistens.forEach((unlisten) => unlisten());
            unlistens = [];
            resizeObserver?.disconnect();
            // 清除定时器
            if (updateInterval) {
                clearInterval(updateInterval);
            }
        };
    });

    // 添加手动刷新方法
    async function refreshTimeProgress() {
        await getTimeProgress();
    }

    // 监听刷新事件
    async function setupListeners() {
        // 原有的监听器保持不变
        const unlistenVisibility = await listen("toggle-time-progress", async (event) => {
            const win = await getCurrentWindow();
            const shouldShow = event.payload as boolean;
            if (shouldShow) {
                await win.show();
                // 显示时刷新数据
                await refreshTimeProgress();
            } else {
                await win.hide();
            }
        });
        unlistens.push(unlistenVisibility);

        const unlistenAlwaysOnTop = await listen("set-time-progress-always-on-top", async (event) => {
            const win = await getCurrentWindow();
            const shouldBeOnTop = event.payload as boolean;
            await win.setAlwaysOnTop(shouldBeOnTop);
        });
        unlistens.push(unlistenAlwaysOnTop);

        // 添加刷新事件监听
        const unlistenRefresh = await listen("refresh-time-progress", async () => {
            await refreshTimeProgress();
        });
        unlistens.push(unlistenRefresh);
    }
</script>

<div bind:this={rootElement} class="w-full h-full">
    <TimeProgressBar {timeSegments} />
</div>

<style>
    :global(body) {
        background-color: transparent !important;
        margin: 0;
        padding: 0;
        overflow: hidden;
    }
</style>
