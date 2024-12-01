<script lang="ts">
    import Terminal from "lucide-svelte/icons/terminal";
    import * as Alert from "$lib/components/ui/alert";
    import { listen, type UnlistenFn } from "@tauri-apps/api/event";
    import { onMount } from "svelte";
    import { WebviewWindow, getAllWebviewWindows, getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

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
        setupListenEvent();
        return () => {
            unlisten?.();
        };
    });

</script>

<Alert.Root>
    <Terminal class="size-4" />
    <Alert.Title>{title}</Alert.Title>
    <Alert.Description>{description}</Alert.Description>
</Alert.Root>

<style>
</style>
