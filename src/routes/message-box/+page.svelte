<script lang="ts">
    import * as Alert from "$lib/components/ui/alert";
    import { invoke } from "@tauri-apps/api/core";
    import { listen, type UnlistenFn } from "@tauri-apps/api/event";
    import { onMount, onDestroy } from "svelte";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import NotificationManager from "../../notification_manager";
    import { getUnreadNotifications, markNotificationAsReadByType, type NotificationRecord } from "../../store";

    type MessageBoxProps = {
        title: string;
        description: string;
    };

    type NotificationPayload = {
        title: string;
        description: string;
    };

    let { title = "", description = "" }: MessageBoxProps = $props();

    let unlistens: UnlistenFn[] = [];
    let rootElement: HTMLElement;
    let pageHeight = 0;
    let systemNotifications: NotificationRecord[] = [];
    let window: Awaited<ReturnType<typeof getCurrentWindow>>;
    let notificationManager: NotificationManager;

    const resizeObserver = new ResizeObserver(updateHeight);

    function handleError(message: string) {
        return (error: unknown) => {
            console.error(`${message}:`, error);
        };
    }

    async function disableFlashAndHide() {
        if (!window) return;

        await Promise.all([
            markNotificationAsRead().catch(handleError("Failed to mark notification as read")),
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

    async function markNotificationAsRead() {
        console.log("markNotificationAsRead: markNotificationAsReadByType(0)");
        await markNotificationAsReadByType(0);
    }

    async function setupEventListeners() {
        const notificationUnlisten = listen<NotificationPayload>("notification-message", () =>
            loadMessageBoxData().catch(handleError("Failed to load message box data"))
        );

        const heightQueryUnlisten = listen("query-message-box-height", () => updateHeight());

        // tray_flash_did_click
        const trayFlashDidClickUnlisten = listen("tray_flash_did_click", () => {
            disableFlashAndHide().catch(handleError("Failed to handle tray flash click"));
        });

        unlistens = await Promise.all([notificationUnlisten, heightQueryUnlisten, trayFlashDidClickUnlisten]);
    }

    async function loadMessageBoxData() {
        const unreadNotifications = await getUnreadNotifications();
        systemNotifications = unreadNotifications.filter((n) => n.type_ === 0);

        if (systemNotifications.length > 0) {
            const latestNotification = systemNotifications.reduce((latest, current) =>
                new Date(current.created_at) > new Date(latest.created_at) ? current : latest
            );

            title = latestNotification.title;
            description = latestNotification.content;
            await invoke("flash_tray_icon", { flash: true }).catch(handleError("Failed to enable tray icon flash"));
        } else {
            console.log("No system notifications found, will set title and description to empty strings");
            title = description = "";
        }
    }

    onMount(async () => {
        try {
            console.log("MessageBox page mounted");
            notificationManager = await NotificationManager.initialize();
            await Promise.all([loadMessageBoxData(), setupEventListeners()]);
            document.addEventListener("click", handleGlobalClick);
            resizeObserver.observe(rootElement);
        } catch (error) {
            handleError("Failed to initialize message box")(error);
        }
    });

    onDestroy(() => {
        console.log("MessageBox page destroyed");
        notificationManager.stop();
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
