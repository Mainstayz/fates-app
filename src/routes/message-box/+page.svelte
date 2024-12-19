<script lang="ts">
    import * as Alert from "$lib/components/ui/alert";
    import { invoke } from "@tauri-apps/api/core";
    import { listen, type UnlistenFn } from "@tauri-apps/api/event";
    import { onMount, onDestroy } from "svelte";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { getUnreadNotifications, markNotificationAsReadByType, type NotificationRecord } from "../../store";

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
    let systemNotifications: NotificationRecord[] = [];

    const window = getCurrentWindow();

    async function disableFlashAndHide() {
        try {
            await markNotificationAsRead();
        } catch (error) {
            console.error("Failed to handle tray icon:", error);
        } finally {
            // 关闭闪烁托盘图标
            await invoke("flash_tray_icon", { flash: false });
            // 隐藏消息盒子，并暂停鼠标跟踪
            await window.emit("hide-message-box");
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

    async function markNotificationAsRead() {
        try {
            await markNotificationAsReadByType(0);
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    }

    // notification-message
    async function setupEventListeners() {
        try {
            const notificationUnlisten = await listen<NotificationPayload>("notification-message", (event) => {
                loadMessageBoxData()
                    .finally(() => {
                        console.log("On notification-message event, load message box data and update height ..");
                    })
                    .catch((error) => {
                        console.error("Failed to load message box data:", error);
                    });
            });

            const heightQueryUnlisten = await listen("query-message-box-height", (event) => updateHeight(true));

            unlistens.push(notificationUnlisten, heightQueryUnlisten);
        } catch (error) {
            console.error("Failed to setup event listeners:", error);
        }
    }

    async function loadMessageBoxData() {
        try {
            const unreadNotifications = await getUnreadNotifications();
            systemNotifications = unreadNotifications.filter((n) => n.type_ === 0);

            if (systemNotifications.length > 0) {
                // 按创建时间排序，获取最新的消息
                const latestNotification = systemNotifications.sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0];

                title = latestNotification.title;
                description = latestNotification.content;

                // 闪烁托盘图标
                await invoke("flash_tray_icon", { flash: true });
            } else {
                title = "";
                description = "";
            }
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
