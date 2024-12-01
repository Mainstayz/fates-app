<script lang="ts">
    import Terminal from "lucide-svelte/icons/terminal";
    import * as Alert from "$lib/components/ui/alert";
    import { listen, type UnlistenFn } from "@tauri-apps/api/event";
    import { onMount, onDestroy } from "svelte";
    import { MouseTrackerState } from "../../mouse-tracker.svelte";

    const mouseTrackerState = new MouseTrackerState();
    console.log(mouseTrackerState);

    let { title = "", description = "" }: { title: string; description: string } = $props();

    let unlisten: UnlistenFn | void;
    async function setupListenEvent() {
        unlisten = await listen<{ title: string; description: string }>("notification-message", (event) => {
            console.log(event.payload);
            try {
                const json_object = event.payload;
                title = json_object.title;
                description = json_object.description;
            } catch (error) {
                console.error("Failed to parse notification message:", error);
            }
        }).catch((error) => {
            console.error("Failed to listen notification message:", error);
        });
    }
    onMount(() => {
        mouseTrackerState.init();
        setupListenEvent();
        return () => {
            unlisten?.();
        };
    });
    onDestroy(() => {
        mouseTrackerState.destroy();
    });

    let statusText = $derived(mouseTrackerState.isInside ? "Inside Window" : "Outside Window");
    let position = $derived(mouseTrackerState.position);
    let state = $derived(mouseTrackerState.state);
</script>

<Alert.Root>
    <Terminal class="size-4" />
    <div>
        <p>Status: {statusText}</p>
        <p>Position: {position}</p>
        <p>State: {state}</p>
    </div>
    <Alert.Title>{title}</Alert.Title>
    <Alert.Description>{description}</Alert.Description>
</Alert.Root>

<style>
</style>
