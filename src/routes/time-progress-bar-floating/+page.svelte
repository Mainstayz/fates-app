<script lang="ts">
    import TimeProgressBar from "$lib/components/TimeProgressBar.svelte";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { listen, type UnlistenFn } from "@tauri-apps/api/event";
    import { onMount, onDestroy } from "svelte";

    let unlisten: UnlistenFn | void;

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
    });

    onDestroy(() => {
        unlisten?.();
    });
</script>

<TimeProgressBar />

<style>
    :global(body) {
        background-color: transparent !important;
        margin: 0;
        padding: 0;
        overflow: hidden;
    }
</style>
