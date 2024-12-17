<script lang="ts">
    import * as Alert from "$lib/components/ui/alert";
    import { invoke } from "@tauri-apps/api/core";
    import { listen, type UnlistenFn } from "@tauri-apps/api/event";
    import { onMount, onDestroy } from "svelte";
    import { getCurrentWindow } from "@tauri-apps/api/window";

    interface MessageBoxProps {
        title: string;
        description: string;
    }

    interface NotificationPayload {
        title: string;
        description: string;
    }

    let { title = "", description = "" }: MessageBoxProps = $props();

    let unlistens: UnlistenFn[] = [];
    let rootElement: HTMLElement;
    let pageHeight = 0;
    let lastHeight = 0;
    let resizeObserver: ResizeObserver | null = null;

    const window = getCurrentWindow();

    async function disableFlashAndHide() {
        try {
            await invoke("flash_tray_icon", { flash: false });
            await window.emit("hide-message-box");
        } catch (error) {
            console.error("Failed to handle tray icon:", error);
        }
    }

    function handleGlobalClick() {
        disableFlashAndHide();
    }

    async function updateHeight(force: boolean = false) {
        if (!rootElement) return;

        const newHeight = rootElement.clientHeight;
        if (pageHeight === newHeight && !force) return;

        pageHeight = newHeight;
        try {
            console.log("emit height change:", newHeight);
            await window.emit("message-box-height", newHeight);
        } catch (error) {
            console.error("Failed to emit height change:", error);
        }
    }

    async function handleNotificationMessage(payload: NotificationPayload) {
        try {
            title = payload.title;
            description = payload.description;
            // 触发高度更新事件
            updateHeight(true);
        } catch (error) {
            console.error("Failed to handle notification:", error);
        }
    }

    async function setupEventListeners() {
        try {
            const notificationUnlisten = await listen<NotificationPayload>("notification-message", (event) =>
                handleNotificationMessage(event.payload)
            );

            const heightQueryUnlisten = await listen("query-message-box-height", (event) => updateHeight(true));

            unlistens.push(notificationUnlisten, heightQueryUnlisten);
        } catch (error) {
            console.error("Failed to setup event listeners:", error);
        }
    }

    async function loadMessageBoxData() {
        try {
            // const store = await load("message-box.json", { autoSave: false });
            title = "";
            description = "";
        } catch (error) {
            console.error("Failed to load message box data:", error);
        }
    }

    function setupResizeObserver() {
        if (!rootElement) return;

        resizeObserver = new ResizeObserver((entries) => updateHeight(true));
        resizeObserver.observe(rootElement);
    }

    onMount(async () => {
        await loadMessageBoxData();
        await setupEventListeners();
        document.addEventListener("click", handleGlobalClick);
        setupResizeObserver();
    });

    onDestroy(() => {
        unlistens.forEach((unlisten) => unlisten());
        resizeObserver?.disconnect();
        document.removeEventListener("click", handleGlobalClick);
    });
</script>

<div bind:this={rootElement}>
    <Alert.Root class="py-2 px-3">
        <Alert.Title class="font-semibold">{title}</Alert.Title>
        <Alert.Description>
            <p>{description}</p>
        </Alert.Description>
    </Alert.Root>
</div>

<style>
    :global(body) {
        background-color: transparent !important;
    }
</style>
