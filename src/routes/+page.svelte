<script lang="ts">
    import App from "./app.svelte";
    import { onMount } from "svelte";
    import { MouseTrackerState } from "../mouse-tracker.svelte";
    import { MessageBoxManager } from "$lib/MessageBoxManager";

    const mouseTrackerState = new MouseTrackerState();
    let messageBoxManager: MessageBoxManager;

    onMount(() => {
        mouseTrackerState.init();
        messageBoxManager = new MessageBoxManager(mouseTrackerState);
        messageBoxManager.initialize();

        return () => {
            mouseTrackerState.destroy();
            messageBoxManager.destroy();
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
