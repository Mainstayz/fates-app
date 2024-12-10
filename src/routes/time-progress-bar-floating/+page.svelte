<script lang="ts">
    import TimeProgressBar from "$lib/components/TimeProgressBar.svelte";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { listen, type UnlistenFn } from "@tauri-apps/api/event";
    import { onMount, onDestroy } from "svelte";
    import { getAllMatters } from "../../store";
    import { fetch } from "@tauri-apps/plugin-http";

    let unlisten: UnlistenFn | void;

    let resizeObserver: ResizeObserver | null = null;
    let rootElement: HTMLElement;
    const window = getCurrentWindow();

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

    async function setupListeners() {
        // 监听显示/隐藏事件
        const unlistenVisibility = await listen("toggle-time-progress", async (event) => {
            const win = await getCurrentWindow();
            const shouldShow = event.payload as boolean;
            if (shouldShow) {
                await win.show();
            } else {
                await win.hide();
            }
        });
        unlistens.push(unlistenVisibility);

        // 监听置顶状态变化
        const unlistenAlwaysOnTop = await listen("set-time-progress-always-on-top", async (event) => {
            const win = await getCurrentWindow();
            const shouldBeOnTop = event.payload as boolean;
            await win.setAlwaysOnTop(shouldBeOnTop);
        });
        unlistens.push(unlistenAlwaysOnTop);
    }

    async function getTimeProgress() {
        const matters = await fetch("http://localhost:8523/matter");
        console.log("matters:", matters);
    }

    onMount(() => {
        console.log("onMount");
        getTimeProgress();
        setupListeners();
        setupResizeObserver();
        return () => {
            console.log("onMount return");
            unlistens.forEach((unlisten) => unlisten());
            unlistens = [];
            resizeObserver?.disconnect();
        };
    });
</script>

<div bind:this={rootElement} class="w-full h-full">
    <TimeProgressBar />
</div>

<style>
    :global(body) {
        background-color: transparent !important;
        margin: 0;
        padding: 0;
        overflow: hidden;
    }
</style>
