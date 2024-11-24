<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
    import { load } from "@tauri-apps/plugin-store";
    import { onMount, onDestroy } from "svelte";
    let { open = $bindable(), ...props } = $props();

    let language = $state("zh"); // 默认中文
    let autoStart = $state(false);
    let checkInterval = $state(2); // 默认 2 小时

    // 添加语言选项配置
    const languages = [
        { value: "zh", label: "中文" },
        { value: "en", label: "English" },
    ] as const;

    function getLanguageLabel(value: string) {
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

    // 初始化时获取自启动状态
    async function initSettings() {
        try {
            console.log("初始化设置：");
            autoStart = await isEnabled();
            let settings = await load("settings.json", { autoSave: false });
            language = (await settings.get<string>("language")) || "zh";
            checkInterval = (await settings.get<number>("checkInterval")) || 2;
        } catch (error) {
            console.error("Failed to get autostart status:", error);
        }
    }

    async function saveSettings() {
        try {
            console.log("保存设置：", language, checkInterval);
            let settings = await load("settings.json", { autoSave: false });
            settings.set("language", language);
            settings.set("checkInterval", checkInterval);
            await settings.save();
        } catch (error) {
            console.error("保存设置失败：", error);
        }
    }

    onMount(async () => {
        await initSettings();
    });

    $effect(() => {
        if (open) {
            saveSettings();
        }
    });
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[800px]">
        <Dialog.Header>
            <Dialog.Title>设置</Dialog.Title>
        </Dialog.Header>
        <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
                <Label for="language-select" class="text-right">语言</Label>
                <div class="col-span-3">
                    <Select.Root type="single" bind:value={language}>
                        <Select.Trigger class="w-full">
                            {getLanguageLabel(language)}
                        </Select.Trigger>
                        <Select.Content>
                            {#each languages as languageOption}
                                <Select.Item value={languageOption.value}>
                                    {languageOption.label}
                                </Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
                <Label for="autostart-checkbox" class="text-right">开机启动</Label>
                <div class="col-span-3">
                    <Checkbox id="autostart-checkbox" bind:checked={autoStart} onCheckedChange={toggleAutoStart} />
                </div>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
                <Label for="check-interval-input" class="text-right">检测间隔 (小时)</Label>
                <Input
                    id="check-interval-input"
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    class="col-span-3"
                    bind:value={checkInterval}
                />
            </div>
        </div>
        <Dialog.Footer>
            <Dialog.Close class="btn">关闭</Dialog.Close>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<style>
    :global([type="text"]),
    :global([type="date"]),
    :global([type="number"]),
    :global([type="time"]) {
        background-color: var(--background) !important;
    }
</style>
