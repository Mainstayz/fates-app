<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import { Separator } from "$lib/components/ui/separator";
    import { Switch } from "$lib/components/ui/switch";
    import { Textarea } from "$lib/components/ui/textarea";
    import { emit } from "@tauri-apps/api/event";
    import { appDataDir } from "@tauri-apps/api/path";
    import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
    import { confirm } from "@tauri-apps/plugin-dialog";
    import { open as openPath } from "@tauri-apps/plugin-shell";
    import { onMount } from "svelte";
    import { locale, t } from "svelte-i18n";
    import { cubicInOut } from "svelte/easing";
    import { crossfade } from "svelte/transition";
    import { appConfig } from "$src/app-config";
    import { NOTIFICATION_RELOAD_TIMELINE_DATA } from "$src/config";
    import { check } from "@tauri-apps/plugin-updater";
    import { relaunch } from "@tauri-apps/plugin-process";
    import { getVersion } from "@tauri-apps/api/app";

    let { open = $bindable() } = $props();

    let language = $state<string | undefined>(undefined);
    let autoStart = $state<boolean | undefined>(undefined);
    let checkInterval = $state<string | undefined>(undefined);
    let currentSection = $state("common");
    let workStart = $state<string | undefined>(undefined);
    let workEnd = $state<string | undefined>(undefined);
    let aiEnabled = $state<boolean | undefined>(undefined);
    let aiBaseUrl = $state<string | undefined>(undefined);
    let aiModelId = $state<string | undefined>(undefined);
    let aiApiKey = $state<string | undefined>(undefined);
    let aiReminderPrompt = $state<string | undefined>(undefined);
    let settingsLoaded = $state(false);
    let currentVersion = $state<string | undefined>(undefined);
    let updateAvailable = $state(false);
    let updateInProgress = $state(false);
    let updateStatus = $state<string | undefined>(undefined);

    const InternalMap = $derived({
        "120": $t("app.settings.checkInterval.120"),
        "240": $t("app.settings.checkInterval.240"),
        "360": $t("app.settings.checkInterval.360"),
    });

    const navItems = $derived([
        { id: "common", title: $t("app.settings.nav.common") },
        { id: "notification", title: $t("app.settings.nav.notification") },
        { id: "ai", title: $t("app.settings.ai.title") },
        { id: "update", title: $t("app.settings.update.title") },
    ]);

    $effect(() => {
        if (!settingsLoaded) return;

        if (checkInterval !== undefined) {
            appConfig.notifications.checkIntervalMinutes = parseInt(checkInterval);
        }
        if (workStart !== undefined) {
            appConfig.notifications.workStart = workStart;
        }
        if (workEnd !== undefined) {
            appConfig.notifications.workEnd = workEnd;
        }
        if (language !== undefined && language.length > 0) {
            appConfig.language = language;
            locale.set(language);
        }
        if (aiEnabled !== undefined) {
            appConfig.aiEnabled = aiEnabled;
        }
        if (aiBaseUrl !== undefined) {
            appConfig.aiBaseUrl = aiBaseUrl;
        }
        if (aiModelId !== undefined) {
            appConfig.aiModelId = aiModelId;
        }
        if (aiApiKey !== undefined) {
            appConfig.aiApiKey = aiApiKey;
        }
        if (aiReminderPrompt !== undefined) {
            appConfig.aiReminderPrompt = aiReminderPrompt;
        }
    });

    const languages = [
        { value: "zh", label: "中文" },
        { value: "en", label: "English" },
    ] as const;

    function getLanguageLabel(value: string | undefined) {
        if (!value) return $t("app.settings.language");
        return languages.find((l) => l.value === value)?.label ?? $t("app.settings.language");
    }

    async function toggleAutoStart(enabled: boolean) {
        console.log("设置开机启动：", enabled);
        try {
            if (enabled) {
                await enable();
            } else {
                await disable();
            }
        } catch (error) {
            console.error("设置开机启动失败：", error);
        }
    }

    async function initSettings() {
        try {
            autoStart = await isEnabled();
            workStart = appConfig.notifications.workStart;
            console.log("workStart", workStart);
            if (workStart == "") {
                appConfig.notifications.workStart = "09:00";
                workStart = "09:00";
            }
            workEnd = appConfig.notifications.workEnd;
            console.log("workEnd", workEnd);
            if (workEnd == "") {
                appConfig.notifications.workEnd = "18:00";
                workEnd = "18:00";
            }
            checkInterval = appConfig.notifications.checkIntervalMinutes.toString();
            console.log("checkInterval", checkInterval);
            if (checkInterval == "") {
                appConfig.notifications.checkIntervalMinutes = 120;
                checkInterval = "120";
            }
            language = appConfig.language;
            console.log("language", language);
            if (language == "") {
                appConfig.language = "zh";
                language = "zh";
            }
            aiEnabled = appConfig.aiEnabled;
            console.log("aiEnabled:", aiEnabled);
            aiBaseUrl = appConfig.aiBaseUrl;
            console.log("aiBaseUrl:", aiBaseUrl);
            aiModelId = appConfig.aiModelId;
            console.log("aiModelId:", aiModelId);
            aiApiKey = appConfig.aiApiKey;
            console.log("aiApiKey:", aiApiKey);
            aiReminderPrompt = appConfig.aiReminderPrompt;
            console.log("aiReminderPrompt:", aiReminderPrompt);
            if (aiReminderPrompt == "") {
                aiReminderPrompt =
                    "你是一名人工智能女友，旨在提供陪伴和支持。不过，你不会安慰用户，相反，你会鼓励用户做人要进步。";
            }
        } catch (error) {
            console.error("Failed to get settings:", error);
        }
    }

    async function handleClearData() {
        const confirmed = await confirm("确定要清除所有数据吗？此操作不可恢复。", {
            title: "清除数据",
            kind: "warning",
        });
        if (confirmed) {
            try {
                console.log("数据已清除");
                await reloadData();
            } catch (error) {
                console.error("清除数据失败：", error);
            }
        }
    }

    async function openDataFolder() {
        try {
            const dataDir = await appDataDir();
            console.log("打开数据文件夹：", dataDir);
            await openPath(dataDir);
        } catch (error) {
            console.error("打开数据文件夹失败：", error);
        }
    }

    async function reloadData() {
        try {
            await emit(NOTIFICATION_RELOAD_TIMELINE_DATA);
            console.log("已触发数据重新加载");
        } catch (error) {
            console.error("重新加载数据失败：", error);
        }
    }

    const [send, receive] = crossfade({
        duration: 250,
        easing: cubicInOut,
    });

    async function checkForUpdates() {
        updateInProgress = true;
        updateStatus = $t("app.settings.update.checking");

        try {
            const update = await check();
            if (update) {
                updateAvailable = true;
                updateStatus = $t("app.settings.update.available", {
                    values: { version: update.version },
                });

                let downloaded = 0;
                let contentLength = 0;

                await update.downloadAndInstall((event) => {
                    switch (event.event) {
                        case "Started":
                            contentLength = event.data.contentLength || 0;
                            updateStatus = $t("app.settings.update.downloading");
                            break;
                        case "Progress":
                            downloaded += event.data.chunkLength || 0;
                            updateStatus = $t("app.settings.update.progress", {
                                values: {
                                    downloaded: (downloaded / 1024 / 1024).toFixed(1),
                                    total: (contentLength / 1024 / 1024).toFixed(1),
                                },
                            });
                            break;
                        case "Finished":
                            updateStatus = $t("app.settings.update.installing");
                            break;
                    }
                });

                updateStatus = $t("app.settings.update.restarting");
                await relaunch();
            } else {
                updateAvailable = false;
                updateStatus = $t("app.settings.update.latest");
            }
        } catch (error) {
            console.error("检查更新失败：", error);
            updateStatus = $t("app.settings.update.error");
        } finally {
            updateInProgress = false;
        }
    }

    onMount(async () => {
        await initSettings();
        currentVersion = await getVersion();
        settingsLoaded = true;
    });
</script>

<Dialog.Root bind:open>
    <Dialog.Portal>
        <Dialog.Overlay class="bg-[#000000]/20" />
        <Dialog.Content class="sm:max-w-[800px] h-[600px]">
            {#if !settingsLoaded}
                <div class="flex items-center justify-center h-full">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            {:else}
                <div class="flex flex-col gap-4">
                    <Label class="text-2xl font-bold">{$t("app.settings.title")}</Label>
                    <div class="grid grid-cols-[200px_1fr] gap-6">
                        <div class="flex flex-col gap-2">
                            {#each navItems as item}
                                {@const isActive = currentSection === item.id}
                                <Button
                                    variant="ghost"
                                    class="relative justify-start hover:bg-transparent"
                                    onclick={() => (currentSection = item.id)}
                                >
                                    {#if isActive}
                                        <div
                                            class="absolute inset-0 rounded-md bg-muted"
                                            in:send={{ key: "active-settings-tab" }}
                                            out:receive={{ key: "active-settings-tab" }}
                                        ></div>
                                    {/if}
                                    <span class="relative">{item.title}</span>
                                </Button>
                            {/each}
                        </div>

                        <div class="flex flex-col p-4 rounded-lg gap-4">
                            {#if currentSection === "common"}
                                <div class="flex items-center justify-between space-x-2">
                                    <Label for="necessary" class="flex flex-col flex-1 space-y-1">
                                        <span>{$t("app.settings.autoStart.title")}</span>
                                        <span class="text-muted-foreground text-xs font-normal leading-snug">
                                            {$t("app.settings.autoStart.description")}
                                        </span>
                                    </Label>
                                    <Switch id="necessary" bind:checked={autoStart} />
                                </div>

                                <div class="flex flex-col gap-2">
                                    <Label for="language">
                                        <span>{$t("app.settings.language")}</span>
                                    </Label>

                                    <Select.Root type="single" bind:value={language}>
                                        <Select.Trigger>
                                            <span>{getLanguageLabel(language)}</span>
                                        </Select.Trigger>
                                        <Select.Content>
                                            {#each languages as language}
                                                <Select.Item value={language.value}>{language.label}</Select.Item>
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                </div>
                            {:else if currentSection === "notification"}
                                <div class="space-y-4">
                                    <div class="flex flex-row gap-2 items-center">
                                        <div class="flex flex-col gap-2">
                                            <Label for="work-start">{$t("app.settings.workTime.title")}</Label>
                                            <div class="flex flex-row gap-2 items-center">
                                                <Input
                                                    bind:value={workStart}
                                                    type="time"
                                                    id="work-start"
                                                    class="bg-background h-[24px] w-[72px]"
                                                />
                                                <span class="text-muted-foreground"
                                                    >{$t("app.settings.workTime.to")}</span
                                                >
                                                <Input
                                                    bind:value={workEnd}
                                                    type="time"
                                                    id="work-end"
                                                    class="bg-background h-[24px] w-[72px]"
                                                />
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
                                                    <Select.Item value={key}
                                                        >{InternalMap[key as keyof typeof InternalMap]}</Select.Item
                                                    >
                                                {/each}
                                            </Select.Content>
                                        </Select.Root>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <Label for="prompt">{$t("app.settings.aiReminder.title")}</Label>
                                        <Textarea bind:value={aiReminderPrompt} id="prompt" class="bg-background" />
                                    </div>
                                </div>
                            {:else if currentSection === "ai"}
                                <div class="space-y-4">
                                    <!-- <div class="flex flex-col gap-2">
                                        <Label class="text-lg font-medium">{$t("app.settings.ai.configTitle")}</Label>
                                        <p class="text-muted-foreground text-sm">
                                            {$t("app.settings.ai.configDescription")}
                                        </p>
                                    </div> -->
                                    <!-- <Separator class="my-4" /> -->
                                    <div class="flex items-center justify-between space-x-2">
                                        <Label for="ai-enabled" class="flex flex-col flex-1 space-y-1">
                                            <span>{$t("app.settings.ai.enabled")}</span>
                                            <span class="text-muted-foreground text-xs font-normal leading-snug">
                                                {$t("app.settings.ai.enableDescription")}
                                            </span>
                                        </Label>
                                        <Switch id="ai-enabled" bind:checked={aiEnabled} />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <Label for="ai-base-url">{$t("app.settings.ai.baseUrl")}</Label>
                                        <Input
                                            bind:value={aiBaseUrl}
                                            class="bg-background"
                                            type="text"
                                            id="ai-base-url"
                                            placeholder="https://api.example.com"
                                        />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <Label for="ai-model-id">{$t("app.settings.ai.modelId")}</Label>
                                        <Input
                                            bind:value={aiModelId}
                                            type="text"
                                            class="bg-background"
                                            id="ai-model-id"
                                            placeholder="gpt-3.5-turbo"
                                        />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <Label for="ai-api-key">{$t("app.settings.ai.apiKey")}</Label>
                                        <Input
                                            bind:value={aiApiKey}
                                            type="password"
                                            class="bg-background"
                                            id="ai-api-key"
                                            placeholder={$t("app.settings.ai.apiKeyPlaceholder")}
                                        />
                                    </div>
                                </div>
                            {:else if currentSection === "update"}
                                <div class="space-y-4">
                                    <!-- <div class="flex flex-col gap-2">
                                        <Label class="text-lg font-medium">{$t("app.settings.update.title")}</Label>
                                        <p class="text-muted-foreground text-sm">
                                            {$t("app.settings.update.description")}
                                        </p>
                                    </div> -->
                                    <!-- <Separator class="my-4" /> -->
                                    <div class="flex flex-col gap-4">
                                        <div class="flex flex-col gap-2">
                                            <Label>{$t("app.settings.update.currentVersion")}</Label>
                                            <div class="text-muted-foreground">{currentVersion}</div>
                                        </div>
                                        <div class="flex flex-col gap-2">
                                            <Label>{$t("app.settings.update.status")}</Label>
                                            <div class="text-muted-foreground">{updateStatus}</div>
                                        </div>
                                        <Button onclick={checkForUpdates} disabled={updateInProgress}>
                                            {updateInProgress
                                                ? $t("app.settings.update.checking")
                                                : $t("app.settings.update.check")}
                                        </Button>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            {/if}
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>

<style>
</style>
