<script lang="ts">
    import TimeProgressBar from "$lib/components/time-progress-bar.svelte";
    import platform, { initializePlatform, type UnlistenFn, REFRESH_TIME_PROGRESS } from "$src/platform";
    import dayjs from "dayjs";
    import { onMount } from "svelte";
    import type { Matter } from "$src/types";

    let resizeObserver: ResizeObserver | null = null;
    let rootElement: HTMLElement;

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
        // await window.emit("time-progress-bar-height", newHeight);
        console.log("update time-progress-bar-height:", newHeight);
    }

    let unlistens: UnlistenFn[] = [];

    let updateInterval: ReturnType<typeof setInterval> | undefined;

    function setupUpdateInterval() {
        getTimeProgress();
        updateInterval = setInterval(() => {
            getTimeProgress();
        }, 60 * 1000);
    }

    async function getTimeProgress() {
        const start = dayjs().startOf("day").toISOString();
        const end = dayjs().endOf("day").toISOString();
        const matters = await platform.instance.storage.getMattersByRange(start, end);

        timeSegments = matters.map((matter: Matter) => {
            let color = "#808080";

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

        console.log("transform timeSegments:", timeSegments);
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

            if (updateInterval) {
                clearInterval(updateInterval);
            }
        };
    });

    async function refreshTimeProgress() {
        await getTimeProgress();
    }

    async function handleDoubleClick() {
        console.log("rootElement double clicked");
        // let mainWindow = await Window.getByLabel("main");
        // if (mainWindow) {
        //     await mainWindow.unminimize();
        //     await mainWindow.show();
        //     await mainWindow.setFocus();
        // }
    }

    async function setupListeners() {
        console.log("setupListeners");
        await initializePlatform();
        const unlistenVisibility = await platform.instance.event.listen("toggle-time-progress", async (event) => {
            // const win = await getCurrentWindow();
            const shouldShow = event.payload as boolean;
            if (shouldShow) {
                // await win.show();
                await refreshTimeProgress();
            } else {
                // await win.hide();
            }
        });
        unlistens.push(unlistenVisibility);

        const unlistenRefresh = await platform.instance.event.listen(REFRESH_TIME_PROGRESS, async () => {
            console.log("REFRESH_TIME_PROGRESS event received");
            await refreshTimeProgress();
        });
        unlistens.push(unlistenRefresh);
    }
</script>

<div bind:this={rootElement} class="w-full h-full" on:dblclick={handleDoubleClick} role="application">
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
