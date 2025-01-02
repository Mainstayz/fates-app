<script lang="ts">
    import "../i18n/i18n";
    import { appConfig } from "$src/app-config";
    import TrayManager from "$src/tray-manager.svelte";
    import App from "./app.svelte";
    import { onMount } from "svelte";
    import { TimeProgressBarManager } from "$lib/time-progress-bar-manager";
    import NotificationManager, { type Notification } from "$src/tauri/notification_manager";
    import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

    import { locale, isLoading } from "svelte-i18n";

    let notificationManager: NotificationManager;
    let timeProgressBarManager: TimeProgressBarManager;

    let i18nLoading = $derived(isLoading);

    async function sendSystemNotification(title: string, message: string) {
        let permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
            console.log("请求系统通知权限");
            const permission = await requestPermission();
            permissionGranted = permission === "granted";
        }
        console.log("permissionGranted = ", permissionGranted);
        if (permissionGranted) {
            sendNotification({
                title,
                body: message,
            });
        }
    }

    function onNotificationMessage(payload: Notification) {
        console.log("onNotificationMessage: payload = ", payload);
        sendSystemNotification(payload.title, payload.message).catch((error) => {
            console.error("Failed to send system notification:", error);
        });
    }

    onMount(() => {
        const initialize = async () => {
            // Initialize app config
            await appConfig.init();
            console.log("appConfig initialized");
            // Set language
            let language = appConfig.language;
            console.log("Current language: ", language);
            await locale.set(language);

            // Initialize tray manager
            await TrayManager.init();

            // Initialize notification manager
            console.log("Current language: ", language);

            // Initialize notification manager
            notificationManager = await NotificationManager.initialize(onNotificationMessage);
            // Initialize time progress bar manager
            timeProgressBarManager = TimeProgressBarManager.getInstance();
            await timeProgressBarManager.initialize();
        };

        // 立即执行初始化
        initialize();

        // 返回清理函数
        return () => {
            notificationManager.stop();
            timeProgressBarManager.destroy();
        };
    });
</script>

{#if !i18nLoading}
    <div class="flex justify-center items-center h-full"></div>
{:else}
    <main class="noSelect w-full h-full">
        <App />
    </main>
{/if}

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
