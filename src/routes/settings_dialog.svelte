<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Switch from "$lib/components/ui/switch";
    import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
    import { load } from "@tauri-apps/plugin-store";
    import { onMount, onDestroy } from "svelte";
    import { open as openPath } from "@tauri-apps/plugin-shell";
    import { appDataDir } from "@tauri-apps/api/path";
    import { emit } from "@tauri-apps/api/event";
    import { Button } from "$lib/components/ui/button";
    import { confirm } from '@tauri-apps/plugin-dialog';
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

    async function handleAutoStartChange(checked: boolean) {
        try {
            await toggleAutoStart(checked);
            autoStart = checked;
        } catch (error) {
            console.error("设置开机启动失败：", error);
            autoStart = !checked;
        }
    }

    async function handleClearData() {
        const confirmed = await confirm("确定要清除所有数据吗？此操作不可恢复。", {
            title: "清除数据",
            kind: "warning",
        });
        if (confirmed) {
            try {
                const timelineData = await load("timeline_data.json");
                const tags = await load("tags.json");
                await timelineData.clear();
                await tags.clear();
                await timelineData.save();
                await tags.save();
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
            // 发送重新加载数据的事件
            await emit("reload_timeline_data");
            console.log("已触发数据重新加载");
        } catch (error) {
            console.error("重新加载数据失败：", error);
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
                <Label for="autostart-switch" class="text-right">开机启动</Label>
                <div class="col-span-3">
                    <Switch.Root
                        id="autostart-switch"
                        checked={autoStart}
                        onCheckedChange={handleAutoStartChange}
                    />
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
            <div class="grid grid-cols-4 items-center gap-4">
                <Label class="text-right">数据管理</Label>
                <div class="col-span-3 space-x-2">
                    <Button variant="secondary" size="sm" onclick={openDataFolder}>
                        打开数据文件夹
                    </Button>
                    <Button variant="secondary" size="sm" onclick={reloadData}>
                        重新加载数据
                    </Button>
                    <Button variant="destructive" size="sm" onclick={handleClearData}>
                        清除所有数据
                    </Button>
                    <p class="text-sm text-muted-foreground mt-2">
                        清除数据将永久删除所有事件记录和标签数据，此操作不可恢复。
                    </p>
                </div>
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
