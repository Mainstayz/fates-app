<script lang="ts">
    import * as Alert from "$lib/components/ui/alert";
    import { invoke } from "@tauri-apps/api/core";
    import { listen, emit, type UnlistenFn } from "@tauri-apps/api/event";
    import { onMount, onDestroy } from "svelte";
    // import NotificationManager, { type Notification } from "../../tauri/notification_manager";

    type MessageBoxProps = {
        title: string;
        description: string;
    };

    let { title = "", description = "" }: MessageBoxProps = $props();

    let unlistens: UnlistenFn[] = [];
    let rootElement: HTMLElement;
    let pageHeight = 0;
    // let notificationManager: NotificationManager;

    const resizeObserver = new ResizeObserver(updateHeight);

    function onNotificationMessage(payload: Notification) {
        console.log("onNotificationMessage: payload = ", payload);
        // title = payload.title;
        // description = payload.message;
        // invoke("flash_tray_icon", { flash: true }).catch(handleError("Failed to flash tray icon"));
    }

    function handleError(message: string) {
        return (error: unknown) => {
            console.error(`${message}:`, error);
        };
    }

    async function disableFlashAndHide() {
        await Promise.all([
            // invoke("flash_tray_icon", { flash: false }).catch(handleError("Failed to disable tray icon flash")),
            emit("hide-message-box").catch(handleError("Failed to hide message box")),
        ]);
    }

    const handleGlobalClick = () => {
        console.log("handleGlobalClick");
        invoke("show_main_window").catch(handleError("Failed to show main window"));
        disableFlashAndHide().catch(handleError("Failed to handle global click"));
    };

    async function updateHeight() {
        if (!rootElement || !window) return;

        const newHeight = rootElement.clientHeight;
        if (pageHeight === newHeight) return;

        pageHeight = newHeight;
        console.log("updateHeight: pageHeight = ", pageHeight, ", emit message-box-height event");
        emit("message-box-height", pageHeight).catch(handleError("Failed to emit height change"));
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
        title = "提示";
        description = "今天又是美好的一天，记得完成任务哦！";
    }

    onMount(async () => {
        try {
            console.log("MessageBox page mounted");
            // notificationManager = await NotificationManager.initialize(onNotificationMessage);
            await Promise.all([loadMessageBoxData(), setupEventListeners()]);
            document.addEventListener("click", handleGlobalClick);

            setTimeout(() => {
                if (rootElement) {
                    console.log("rootElement is now available, setting up observer");
                    resizeObserver.observe(rootElement);
                } else {
                    console.warn("Root element not found after DOM mount");
                }
            }, 0);
        } catch (error) {
            handleError("Failed to initialize message box")(error);
        }
    });

    onDestroy(() => {
        console.log("MessageBox page destroyed");
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
