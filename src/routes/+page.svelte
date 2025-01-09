<script lang="ts">
    import "../i18n/i18n";
    import { appConfig } from "$src/app-config";
    import platform, { initializePlatform, REFRESH_TIME_PROGRESS } from "$src/platform";

    import notificationManager, { type Notification, NotificationType } from "$src/tauri/notification_manager";
    import tagManager from "$src/tag-manager.svelte";

    import { onMount } from "svelte";
    import { locale } from "svelte-i18n";
    import App from "./app.svelte";

    let appConfigInitialized = $state(false);
    $inspect("appConfigInitialized: ", appConfigInitialized);

    async function sendSystemNotification(title: string, message: string) {
        let permissionGranted = await platform.instance.notification.isPermissionGranted();
        if (!permissionGranted) {
            console.log("No permission granted");
            const permission = await platform.instance.notification.requestPermission();
            permissionGranted = permission === "granted";
        }
        console.log("Permission granted = ", permissionGranted);
        if (permissionGranted) {
            platform.instance.notification.sendNotification(title, message);
        }
    }

    function onNotificationMessage(payload: Notification) {
        console.log("onNotificationMessage: payload = ", payload);

        if (payload.notificationType === NotificationType.NewTask) {
            // notify time progress bar to refresh
            platform.instance.event.emit(REFRESH_TIME_PROGRESS, {});
        }

        sendSystemNotification(payload.title, payload.message).catch((error) => {
            console.error("Failed to send system notification:", error);
        });
    }

    onMount(() => {
        const initialize = async () => {
            // Initialize platform
            await initializePlatform();

            // Initialize app config
            await appConfig.init(platform.instance.storage);
            console.log("appConfig initialized");

            // Set language
            let language = appConfig.getConfig().language;
            await locale.set(language);
            console.log("Current language: ", language);

            await platform.instance.init();
            appConfigInitialized = true;
            console.log("platform initialized", platform.instance);
        };

        // 立即执行初始化
        initialize();

        // 获取所有标签
        tagManager.fetchAllTags();

        const unlisten = notificationManager.addNotificationCallback(onNotificationMessage);
        // 返回清理函数
        return () => {
            notificationManager.stop();
            unlisten();
            platform.instance.destroy();
        };
    });
</script>

{#if !appConfigInitialized}
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
