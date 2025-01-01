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
    import {
        NOTIFICATION_RELOAD_TIMELINE_DATA,
        SETTING_KEY_AI_API_KEY,
        SETTING_KEY_AI_BASE_URL,
        SETTING_KEY_AI_ENABLED,
        SETTING_KEY_AI_MODEL_ID,
        SETTING_KEY_AI_REMINDER_PROMPT,
        SETTING_KEY_LANGUAGE,
        SETTING_KEY_NOTIFICATION_CHECK_INTERVAL,
        SETTING_KEY_WORK_END_TIME,
        SETTING_KEY_WORK_START_TIME,
    } from "../config";
    import { getKV, setKV } from "../store";

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

    const InternalMap = $derived({
        "120": $t("app.settings.checkInterval.120"),
        "240": $t("app.settings.checkInterval.240"),
        "360": $t("app.settings.checkInterval.360"),
    });

    const navItems = $derived([
        { id: "common", title: $t("app.settings.nav.common") },
        { id: "notification", title: $t("app.settings.nav.notification") },
        { id: "ai", title: $t("app.settings.ai.title") },
    ]);

    $effect(() => {
        if (!settingsLoaded) return;

        if (checkInterval !== undefined) {
            setKV(SETTING_KEY_NOTIFICATION_CHECK_INTERVAL, checkInterval);
        }
        if (workStart !== undefined) {
            setKV(SETTING_KEY_WORK_START_TIME, workStart);
        }
        if (workEnd !== undefined) {
            setKV(SETTING_KEY_WORK_END_TIME, workEnd);
        }
        if (language !== undefined && language.length > 0) {
            setKV(SETTING_KEY_LANGUAGE, language);
            locale.set(language);
        }
        if (aiEnabled !== undefined) {
            setKV(SETTING_KEY_AI_ENABLED, aiEnabled.toString());
        }
        if (aiBaseUrl !== undefined) {
            setKV(SETTING_KEY_AI_BASE_URL, aiBaseUrl);
        }
        if (aiModelId !== undefined) {
            setKV(SETTING_KEY_AI_MODEL_ID, aiModelId);
        }
        if (aiApiKey !== undefined) {
            setKV(SETTING_KEY_AI_API_KEY, aiApiKey);
        }
        if (aiReminderPrompt !== undefined) {
            setKV(SETTING_KEY_AI_REMINDER_PROMPT, aiReminderPrompt);
        }
    });

    const languages = [
        { value: "zh", label: "中文" },
        { value: "en", label: "English" },
    ] as const;

    function getLanguageLabel(value: string | undefined) {
        if (!value) return "选择语言";
        return languages.find((l) => l.value === value)?.label ?? "选择语言";
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
            workStart = await getKV(SETTING_KEY_WORK_START_TIME);
            if (workStart == "") {
                await setKV(SETTING_KEY_WORK_START_TIME, "09:00");
                workStart = "09:00";
            }
            workEnd = await getKV(SETTING_KEY_WORK_END_TIME);
            if (workEnd == "") {
                await setKV(SETTING_KEY_WORK_END_TIME, "18:00");
                workEnd = "18:00";
            }
            checkInterval = await getKV(SETTING_KEY_NOTIFICATION_CHECK_INTERVAL);
            if (checkInterval == "") {
                await setKV(SETTING_KEY_NOTIFICATION_CHECK_INTERVAL, "120");
                checkInterval = "120";
            }
            language = await getKV(SETTING_KEY_LANGUAGE);
            if (language == "") {
                await setKV(SETTING_KEY_LANGUAGE, "zh");
                language = "zh";
            }
            const aiEnabledStr = await getKV(SETTING_KEY_AI_ENABLED);
            aiEnabled = aiEnabledStr === "true";
            aiBaseUrl = await getKV(SETTING_KEY_AI_BASE_URL);
            aiModelId = await getKV(SETTING_KEY_AI_MODEL_ID);
            aiApiKey = await getKV(SETTING_KEY_AI_API_KEY);
            aiReminderPrompt = await getKV(SETTING_KEY_AI_REMINDER_PROMPT);
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

    onMount(async () => {
        await initSettings();
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
                                    <div class="flex flex-col gap-2">
                                        <Label class="text-lg font-medium">AI 配置</Label>
                                        <p class="text-muted-foreground text-sm">配置 AI 模块相关参数</p>
                                    </div>
                                    <Separator class="my-4" />
                                    <div class="flex items-center justify-between space-x-2">
                                        <Label for="ai-enabled" class="flex flex-col flex-1 space-y-1">
                                            <span>启用 AI 模块</span>
                                            <span class="text-muted-foreground text-xs font-normal leading-snug">
                                                启用或禁用 AI 功能模块
                                            </span>
                                        </Label>
                                        <Switch id="ai-enabled" bind:checked={aiEnabled} />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <Label for="ai-base-url">Base URL</Label>
                                        <Input
                                            bind:value={aiBaseUrl}
                                            class="bg-background"
                                            type="text"
                                            id="ai-base-url"
                                            placeholder="https://api.example.com"
                                        />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <Label for="ai-model-id">Model ID</Label>
                                        <Input
                                            bind:value={aiModelId}
                                            type="text"
                                            class="bg-background"
                                            id="ai-model-id"
                                            placeholder="gpt-3.5-turbo"
                                        />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <Label for="ai-api-key">API Key</Label>
                                        <Input
                                            bind:value={aiApiKey}
                                            type="password"
                                            class="bg-background"
                                            id="ai-api-key"
                                            placeholder="输入你的 API Key"
                                        />
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
