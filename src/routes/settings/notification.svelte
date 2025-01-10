<script lang="ts">
    import { Label } from "$lib/components/ui/label";
    import { Input } from "$lib/components/ui/input";
    import * as Select from "$lib/components/ui/select";
    import { Textarea } from "$lib/components/ui/textarea";
    import { Button } from "$lib/components/ui/button";
    import { t } from "svelte-i18n";
    import { appConfig } from "$src/app-config";
    import { onMount } from "svelte";
    import platform from "$src/platform";
    import { notificationManager } from "$src/notification_manager";
    import { Loader2 } from "lucide-svelte";

    let checkInterval = $state<string>("120");
    let workStart = $state<string>("09:00");
    let workEnd = $state<string>("18:00");
    let aiReminderPrompt = $state<string>(
        "你是一名人工智能女友，旨在提供陪伴和支持。不过，你不会安慰用户，相反，你会鼓励用户做人要进步。"
    );
    let initialized = $state(false);
    let notificationPermission = $state<string>("default");
    let aiEnabled = $state(appConfig.getAIConfig().enabled);
    let notificationTestLoading = $state(false);

    // 存储初始值用于比较
    let initialValues = $state({
        checkInterval: "",
        workStart: "",
        workEnd: "",
        aiReminderPrompt: "",
    });

    const InternalMap = $derived({
        "120": $t("app.settings.checkInterval.120"),
        "240": $t("app.settings.checkInterval.240"),
        "360": $t("app.settings.checkInterval.360"),
    });

    async function notificationTest() {
        notificationTestLoading = true;
        let result = await notificationManager.processNotificationCycle(false);
        if (!result) {
            await notificationManager.sendTestNotification();
        }
        notificationTestLoading = false;
    }

    onMount(async () => {
        initialized = false;
        let notifications = appConfig.getNotifications();
        workStart = notifications.workStart;
        workEnd = notifications.workEnd;
        checkInterval = notifications.checkIntervalMinutes.toString();
        aiReminderPrompt = appConfig.getAIConfig().reminderPrompt;
        notificationPermission = (await platform.instance.notification.isPermissionGranted()) ? "granted" : "denied";

        // 记录初始值
        initialValues = {
            checkInterval,
            workStart,
            workEnd,
            aiReminderPrompt,
        };

        initialized = true;
        console.log("[notification] onMount initialized finished");
    });

    async function handleRequestPermission() {
        try {
            const permissionResult = await platform.instance.notification.requestPermission();
            notificationPermission = permissionResult ? "granted" : "denied";
        } catch (e) {
            console.error("Failed to request notification permission:", e);
        }
    }

    // 合并所有配置更新到一个effect中
    $effect(() => {
        if (!initialized) {
            return;
        }

        const currentCheckInterval = parseInt(checkInterval);
        const initialCheckIntervalNum = parseInt(initialValues.checkInterval);

        // 只在值真正改变时更新配置
        if (currentCheckInterval !== initialCheckIntervalNum) {
            appConfig.setNotifications({
                checkIntervalMinutes: currentCheckInterval,
            });
            initialValues.checkInterval = checkInterval;
        }

        if (workStart !== initialValues.workStart) {
            appConfig.setNotifications({
                workStart: workStart,
            });
            initialValues.workStart = workStart;
        }

        if (workEnd !== initialValues.workEnd) {
            appConfig.setNotifications({
                workEnd: workEnd,
            });
            initialValues.workEnd = workEnd;
        }

        if (aiReminderPrompt !== initialValues.aiReminderPrompt) {
            appConfig.setAIConfig({
                reminderPrompt: aiReminderPrompt,
            });
            initialValues.aiReminderPrompt = aiReminderPrompt;
        }
    });
</script>

<div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
        <Label>{$t("app.settings.notification.permission.title")}</Label>
        <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
                <div
                    class={`w-2 h-2 rounded-full ${
                        notificationPermission === "granted"
                            ? "bg-green-500"
                            : notificationPermission === "denied"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                    }`}
                ></div>
                <span class="text-sm text-muted-foreground">
                    {notificationPermission === "granted"
                        ? $t("app.settings.notification.permission.granted")
                        : notificationPermission === "denied"
                          ? $t("app.settings.notification.permission.denied")
                          : $t("app.settings.notification.permission.default")}
                </span>
            </div>
            {#if notificationPermission !== "granted"}
                <Button variant="outline" size="sm" onclick={handleRequestPermission}>
                    {$t("app.settings.notification.permission.request")}
                </Button>
            {/if}
        </div>
    </div>
    <div class="flex flex-row gap-2 items-center">
        <div class="flex flex-col gap-2">
            <Label for="work-start">{$t("app.settings.workTime.title")}</Label>
            <div class="flex flex-row gap-2 items-center">
                <Input bind:value={workStart} type="time" id="work-start" class="bg-background h-[24px] w-[72px]" />
                <span class="text-muted-foreground">{$t("app.settings.workTime.to")}</span>
                <Input bind:value={workEnd} type="time" id="work-end" class="bg-background h-[24px] w-[72px]" />
            </div>
            <span class="text-muted-foreground text-xs font-normal leading-snug">
                {$t("app.settings.workTime.description")}
            </span>
        </div>
    </div>
    <div class="flex flex-col gap-2">
        <Label for="check-interval">{$t("app.settings.checkInterval.title")}</Label>
        <Select.Root type="single" bind:value={checkInterval}>
            <Select.Trigger>
                <span>{InternalMap[checkInterval as keyof typeof InternalMap]}</span>
            </Select.Trigger>
            <Select.Content>
                {#each Object.keys(InternalMap) as key}
                    <Select.Item value={key}>{InternalMap[key as keyof typeof InternalMap]}</Select.Item>
                {/each}
            </Select.Content>
        </Select.Root>
    </div>
    <div class="flex flex-col gap-2">
        <Label class={aiEnabled ? "" : "text-muted-foreground"} for="prompt"
            >{$t("app.settings.aiReminder.title")}</Label
        >
        <Textarea disabled={!aiEnabled} bind:value={aiReminderPrompt} id="prompt" class="bg-background" />
        <Button size="sm" onclick={notificationTest}>
            {#if notificationTestLoading}
                <Loader2 class="w-4 h-4 animate-spin" />
            {:else}
                {$t("app.settings.ai.testing")}
            {/if}
        </Button>
    </div>
</div>
