<script lang="ts">
    import App from "./app.svelte";
    import { onMount } from "svelte";
    import { MouseTrackerState } from "../mouse-tracker.svelte";
    import { MessageBoxManager } from "$lib/MessageBoxManager";
    import { TimeProgressBarManager } from "$lib/TimeProgressBarManager";

    const mouseTrackerState = new MouseTrackerState();
    let messageBoxManager: MessageBoxManager;
    let timeProgressBarManager: TimeProgressBarManager;

    onMount(() => {
        const initialize = async () => {
            // 初始化 MouseTracker
            mouseTrackerState.init();

            // 初始化 MessageBox
            messageBoxManager = new MessageBoxManager(mouseTrackerState);
            await messageBoxManager.initialize();

            // 初始化 TimeProgressBar
            timeProgressBarManager = TimeProgressBarManager.getInstance();
            await timeProgressBarManager.initialize();

            // 默认显示时间进度条
            await timeProgressBarManager.show();
        };

        // 立即执行初始化
        initialize();

        // 返回清理函数
        return () => {
            mouseTrackerState.destroy();
            messageBoxManager.destroy();
            timeProgressBarManager.destroy();
        };
    });
</script>

<main class="noSelect w-full h-full">
    <App />
</main>

<style>
    .noSelect {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }
    .noSelect:focus {
        outline: none !important;
    }
</style>
