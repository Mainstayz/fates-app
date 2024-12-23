<script lang="ts">
    import * as Alert from "$lib/components/ui/alert";
    import { invoke } from "@tauri-apps/api/core";
    import { listen, type UnlistenFn } from "@tauri-apps/api/event";
    import { onMount, onDestroy } from "svelte";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import NotificationManager, { type Notification } from "../../notification_manager";

    type MessageBoxProps = {
        title: string;
        description: string;
    };

    let { title = "", description = "" }: MessageBoxProps = $props();

    let unlistens: UnlistenFn[] = [];
    let rootElement: HTMLElement;
    let pageHeight = 0;
    let window: Awaited<ReturnType<typeof getCurrentWindow>>;
    let notificationManager: NotificationManager;

    const resizeObserver = new ResizeObserver(updateHeight);

    function onNotificationMessage(payload: Notification) {
        console.log("onNotificationMessage: payload = ", payload);
        title = payload.title;
        description = payload.message;
    }

    function handleError(message: string) {
        return (error: unknown) => {
            console.error(`${message}:`, error);
        };
    }

    async function disableFlashAndHide() {
        if (!window) return;

        await Promise.all([
            invoke("flash_tray_icon", { flash: false }).catch(handleError("Failed to disable tray icon flash")),
            window.emit("hide-message-box").catch(handleError("Failed to hide message box")),
        ]);
    }

    const handleGlobalClick = () => {
        disableFlashAndHide().catch(handleError("Failed to handle global click"));
    };

    async function updateHeight() {
        if (!rootElement || !window) return;

        const newHeight = rootElement.clientHeight;
        if (pageHeight === newHeight) return;

        pageHeight = newHeight;
        console.log("updateHeight: pageHeight = ", pageHeight, ", emit message-box-height event");
        await window.emit("message-box-height", pageHeight).catch(handleError("Failed to emit height change"));
    }

    async function setupEventListeners() {
        const heightQueryUnlisten = listen("query-message-box-height", () => updateHeight());
        // tray_flash_did_click
        const trayFlashDidClickUnlisten = listen("tray_flash_did_click", () => {
            disableFlashAndHide().catch(handleError("Failed to handle tray flash click"));
        });

        unlistens = await Promise.all([heightQueryUnlisten, trayFlashDidClickUnlisten]);
    }

    async function loadMessageBoxData() {
        title = description = "";
    }

    onMount(async () => {
        try {
            console.log("MessageBox page mounted");
            notificationManager = await NotificationManager.initialize(onNotificationMessage);
            await Promise.all([loadMessageBoxData(), setupEventListeners()]);
            document.addEventListener("click", handleGlobalClick);
            resizeObserver.observe(rootElement);
        } catch (error) {
            handleError("Failed to initialize message box")(error);
        }
    });

    onDestroy(() => {
        console.log("MessageBox page destroyed");
        if (notificationManager) {
            notificationManager.stop();
        }
        unlistens.forEach((unlisten) => unlisten());
        document.removeEventListener("click", handleGlobalClick);
        resizeObserver.disconnect();
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
