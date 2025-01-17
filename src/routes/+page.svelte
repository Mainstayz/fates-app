<script lang="ts">
    import "../i18n/i18n";
    import { appConfig } from "$src/app-config";
    import platform, { initializePlatform } from "$src/platform";
    import notificationManager, { type Notification, NotificationType } from "$src/notification_manager";
    import tagManager from "$src/tag-manager.svelte";
    import { todoScheduler } from "$src/scheduler";

    import { onMount } from "svelte";
    import { locale } from "svelte-i18n";
    import App from "./app.svelte";
    import { NOTIFICATION_RELOAD_TIMELINE_DATA, REFRESH_TIME_PROGRESS } from "$src/config";
    import SyncIndicator from "$src/components/sync-Indicator.svelte";

    let appConfigInitialized = $state(false);
    $inspect("appConfigInitialized: ", appConfigInitialized);

    let syncIndicator: SyncIndicator;

    async function sendSystemNotification(title: string, message: string) {
        let permissionGranted = await platform.instance.notification.isPermissionGranted();
        if (!permissionGranted) {
            console.log("[Main] No permission granted");
            const permission = await platform.instance.notification.requestPermission();
            permissionGranted = permission === "granted";
        }
        console.log("[Main] Permission granted = ", permissionGranted);
        if (permissionGranted) {
            platform.instance.notification.sendNotification(title, message);
        }
    }

    function onNotificationMessage(payload: Notification) {
        console.log("[Main] onNotificationMessage: payload = ", payload);

        if (payload.notificationType === NotificationType.NewTask) {
            // notify time progress bar to refresh
            platform.instance.event.emit(REFRESH_TIME_PROGRESS, {});
        }

        sendSystemNotification(payload.title, payload.message).catch((error) => {
            console.error("Failed to send system notification:", error);
        });
    }

    let syncListener: () => void | undefined;

    onMount(() => {
        const initialize = async () => {
            // Initialize platform
            console.log("[Main] Initialize platform ..");
            await initializePlatform();
            await platform.instance.init();

            // Initialize app config
            await appConfig.init(platform.instance.storage);
            console.log("[Main] AppConfig initialized");

            // Set language
            let language = appConfig.getConfig().language;
            await locale.set(language);
            console.log("[Main] Current language: ", language);

            appConfigInitialized = true;
            console.log("[Main] platform initialized successfully");

            // sync
            console.log("[Main] Setting up sync listener ..");

            syncListener = platform.instance.storage.onSync(
                (event: { status: string; direction: string; change: any }) => {
                    console.log("[Main] Sync event: ", event);
                    if (syncIndicator) {
                        if (event.status === "change") {
                            syncIndicator.show();
                        } else {
                            syncIndicator.hide();
                        }

                        if (event.direction === "pull") {
                            syncIndicator.toggleDownloadBlinking(true);
                            syncIndicator.toggleUploadBlinking(false);
                        } else if (event.direction === "push") {
                            syncIndicator.toggleDownloadBlinking(false);
                            syncIndicator.toggleUploadBlinking(true);
                        }
                    }
                    if (event.direction === "pull") {
                        let change = event.change.change;
                        let docs = change.docs;
                        let hasNewMatter = false;
                        for (let doc of docs) {
                            console.log("[Main] Sync doc: ", doc);
                            let docId = doc._id;
                            if (docId && docId.startsWith("matters_")) {
                                hasNewMatter = true;
                            }
                        }
                        if (hasNewMatter) {
                            // notify time progress bar to refresh
                            console.log("[Main] Sync has new matter, refreshing timeline ..");
                            platform.instance.event.emit(NOTIFICATION_RELOAD_TIMELINE_DATA, {});
                        }
                    }
                }
            );

            // 获取配置
            let syncEnabledStr = await appConfig.getStoredValue("syncEnabled", true);
            console.log("[Main] Sync enabled: ", syncEnabledStr);
            if (syncEnabledStr === "true") {
                platform.instance.storage.enableSync();
            } else {
                platform.instance.storage.disableSync();
            }

            // 获取所有标签
            // 获取所有标签
            console.log("[Main] Fetching all tags ..");
            await tagManager.fetchAllTags();

            // 启动通知循环
            console.log("[Main] Starting notification loop ..");
            await notificationManager.startNotificationLoop();

            // 启动定时任务
            console.log("[Main] Starting todo scheduler ..");
            todoScheduler.start();
        };

        // 立即执行初始化
        initialize();

        const unlisten = notificationManager.addNotificationCallback(onNotificationMessage);
        // 返回清理函数
        return () => {
            unlisten();
            notificationManager.stopNotificationLoop();
            platform.instance.destroy();
            if (syncListener) {
                syncListener();
            }
            // 停止定时任务
            todoScheduler.stop();
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

<SyncIndicator bind:this={syncIndicator} position="top-right" />

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
