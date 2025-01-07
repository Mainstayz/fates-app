<script lang="ts">
    import { Label } from "$lib/components/ui/label";
    import { Input } from "$lib/components/ui/input";
    import * as Select from "$lib/components/ui/select";
    import { Textarea } from "$lib/components/ui/textarea";
    import { t } from "svelte-i18n";
    import { appConfig } from "$src/app-config";
    import { onMount } from "svelte";

    let checkInterval = $state<string>("120");
    let workStart = $state<string>("09:00");
    let workEnd = $state<string>("18:00");
    let aiReminderPrompt = $state<string>(
        "你是一名人工智能女友，旨在提供陪伴和支持。不过，你不会安慰用户，相反，你会鼓励用户做人要进步。"
    );
    let initialized = $state(false);
    const InternalMap = $derived({
        "120": $t("app.settings.checkInterval.120"),
        "240": $t("app.settings.checkInterval.240"),
        "360": $t("app.settings.checkInterval.360"),
    });

    onMount(() => {
        let startTime = appConfig.notifications.workStart;
        if (startTime == "") {
            appConfig.notifications.workStart = "09:00";
            startTime = "09:00";
        }
        workStart = startTime;

        let endTime = appConfig.notifications.workEnd;
        if (endTime == "") {
            appConfig.notifications.workEnd = "18:00";
            endTime = "18:00";
        }
        workEnd = endTime;

        let interval = appConfig.notifications.checkIntervalMinutes.toString();
        if (interval == "") {
            appConfig.notifications.checkIntervalMinutes = 120;
            interval = "120";
        }
        checkInterval = interval;

        aiReminderPrompt = appConfig.aiReminderPrompt;
        initialized = true;
    });

    $effect(() => {
        if (!initialized) {
            return;
        }

        if (checkInterval) {
            appConfig.notifications.checkIntervalMinutes = parseInt(checkInterval);
        }
        if (workStart) {
            appConfig.notifications.workStart = workStart;
        }
        if (workEnd) {
            appConfig.notifications.workEnd = workEnd;
        }
        if (aiReminderPrompt) {
            appConfig.aiReminderPrompt = aiReminderPrompt;
        }
    });
</script>

<div class="space-y-4">
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
        <Label for="prompt">{$t("app.settings.aiReminder.title")}</Label>
        <Textarea bind:value={aiReminderPrompt} id="prompt" class="bg-background" />
    </div>
</div>
