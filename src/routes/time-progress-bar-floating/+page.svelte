<script lang="ts">
    import TimeProgressBar from "$lib/components/time-progress-bar.svelte";
    import platform, { initializePlatform, type UnlistenFn } from "$src/platform";
    import { NOTIFICATION_TOGGLE_MAIN_WINDOW, REFRESH_TIME_PROGRESS } from "$src/config";
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
            console.warn("RootElement is null");
            return;
        }

        resizeObserver = new ResizeObserver((entries) => updateHeight(true));
        resizeObserver.observe(rootElement);
        console.log("Setup resize observer");
    }

    async function updateHeight(force: boolean = false) {
        if (!rootElement) {
            console.log("RootElement is null");
            return;
        }

        const newHeight = rootElement.clientHeight;
        // await window.emit("time-progress-bar-height", newHeight);
        console.log("Update height:", newHeight);
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

        console.log("Transform timeSegments:", timeSegments);
    }

    onMount(() => {
        console.log("OnMount");
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
        console.log("RootElement double clicked");
        platform.instance.event.emit(NOTIFICATION_TOGGLE_MAIN_WINDOW, true);
    }

    async function setupListeners() {
        console.log("Setup Listeners");
        await initializePlatform();
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
