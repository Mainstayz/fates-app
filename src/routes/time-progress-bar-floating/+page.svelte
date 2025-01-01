<script lang="ts">
    import TimeProgressBar from "$lib/components/time-progress-bar.svelte";
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

    function setupUpdateInterval() {
        getTimeProgress();
        updateInterval = setInterval(() => {
            getTimeProgress();
        }, 60 * 1000);
    }

    async function getTimeProgress() {
        const start = dayjs().startOf("day").toISOString();
        const end = dayjs().endOf("day").toISOString();
        const matters = await getMattersByRange(start, end);

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

    async function setupListeners() {
        const unlistenVisibility = await listen("toggle-time-progress", async (event) => {
            const win = await getCurrentWindow();
            const shouldShow = event.payload as boolean;
            if (shouldShow) {
                await win.show();
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
