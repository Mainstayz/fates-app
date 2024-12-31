<script lang="ts">
    import "../i18n/i18n";
    import _ from "$src/tray.svelte";
    import App from "./app.svelte";
    import { onMount } from "svelte";
    import { TimeProgressBarManager } from "$lib/TimeProgressBarManager";
    import NotificationManager, { type Notification } from "$src/tauri/notification_manager";
    import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

    import { locale } from "svelte-i18n";
    import { getKV, setKV } from "../store";

    let notificationManager: NotificationManager;
    let timeProgressBarManager: TimeProgressBarManager;

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
            let language = await getKV("language");
            if (language == "") {
                language = "zh";
                await setKV("language", language);
            }
            console.log("设置语言：", language);
            locale.set(language);
            notificationManager = await NotificationManager.initialize(onNotificationMessage);

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

<main class="noSelect w-full h-full">
    <App />
</main>

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
