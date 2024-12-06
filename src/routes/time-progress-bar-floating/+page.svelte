<script lang="ts">
    import TimeProgressBar from "$lib/components/TimeProgressBar.svelte";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { listen, type UnlistenFn } from "@tauri-apps/api/event";
    import { onMount, onDestroy } from "svelte";

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

        // 监听置顶状态变化
        const unlistenAlwaysOnTop = await listen("set-time-progress-always-on-top", async (event) => {
            const win = await getCurrentWindow();
            const shouldBeOnTop = event.payload as boolean;
            await win.setAlwaysOnTop(shouldBeOnTop);
        });

        return () => {
            unlistenVisibility();
            unlistenAlwaysOnTop();
        };
    }

    onMount(async () => {
        unlisten = await setupListeners();
        setupResizeObserver();
    });

    onDestroy(() => {
        unlisten?.();
        resizeObserver?.disconnect();
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
