<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";

    import { Separator } from "$lib/components/ui/separator";
    import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
    import { onMount, onDestroy } from "svelte";
    import { open as openPath } from "@tauri-apps/plugin-shell";
    import { appDataDir } from "@tauri-apps/api/path";
    import { emit } from "@tauri-apps/api/event";
    import { Button } from "$lib/components/ui/button";
    import { confirm } from "@tauri-apps/plugin-dialog";
    import { cubicInOut } from "svelte/easing";
    import { crossfade } from "svelte/transition";
    // store
    import { getKV, setKV } from "../store";
    let { open = $bindable(), ...props } = $props();
    import { t, locale } from "svelte-i18n";

    let language = $state(""); // 默认中文
    let autoStart = $state(false);
    let checkInterval = $state("120"); // 默认 120 分钟
    let currentSection = $state("common");

    let workStart = $state("09:00");
    let workEnd = $state("18:00");

    const InternalMap = $derived({
        "120": $t("app.settings.checkInterval.120"),
        "240": $t("app.settings.checkInterval.240"),
        "360": $t("app.settings.checkInterval.360"),
    });

    const navItems = $derived([
        { id: "common", title: $t("app.settings.nav.common") },
        { id: "notification", title: $t("app.settings.nav.notification") },
    ]);

    $effect(() => {
        if (checkInterval) {
            setKV("checkInterval", checkInterval);
        }
        if (workStart) {
            setKV("workStartTime", workStart);
        }
        if (workEnd) {
            setKV("workEndTime", workEnd);
        }
        if (language.length > 0) {
            setKV("language", language);
            console.log("设置语言：", language);
            locale.set(language);
        }
    });

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
            workStart = await getKV("workStartTime");
            if (workStart == "") {
                await setKV("workStartTime", "09:00");
                workStart = "09:00";
            }
            workEnd = await getKV("workEndTime");
            if (workEnd == "") {
                await setKV("workEndTime", "18:00");
                workEnd = "18:00";
            }
            checkInterval = await getKV("checkInterval");
            if (checkInterval == "") {
                await setKV("checkInterval", "120");
                checkInterval = "120";
            }
            language = await getKV("language");
            if (language == "") {
                await setKV("language", "zh");
                language = "zh";
            }
        } catch (error) {
            console.error("Failed to get autostart status:", error);
        }
    }

    async function saveSettings() {
        try {
            console.log("保存设置：", language, checkInterval);
            // let settings = await load("settings.json", { autoSave: false });
            // settings.set("language", language);
            // settings.set("checkInterval", checkInterval);
            // await settings.save();
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
                // const timelineData = await load("timeline_data.json");
                // const tags = await load("tags.json");
                // await timelineData.clear();
                // await tags.clear();
                // await timelineData.save();
                // await tags.save();
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

    const [send, receive] = crossfade({
        duration: 250,
        easing: cubicInOut,
    });

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
    <Dialog.Portal>
        <Dialog.Overlay class="bg-[#000000]/20" />
        <Dialog.Content class="sm:max-w-[800px] h-[600px]">
            <!-- <Dialog.Header class="bg-yellow-500">
            <Dialog.Title>设置</Dialog.Title>
        </Dialog.Header> -->
            <div class="flex flex-col gap-4">
                <Label class="text-2xl font-bold">{$t("app.settings.title")}</Label>
                <div class="grid grid-cols-[200px_1fr] gap-6">
                    <!-- 左侧导航栏 -->
                    <div class="flex flex-col gap-2">
                        {#each navItems as item}
                            {@const isActive = currentSection === item.id}
                            <Button
                                variant="ghost"
                                class="relative justify-start hover:bg-transparent"
                                onclick={() => (currentSection = item.id)}
                            >
                                {#if isActive}
                                    <!-- 样式相关：
                                absolute inset-0 - 使 div 绝对定位并填充整个按钮区域
                                rounded-md - 添加圆角
                                bg-muted - 设置背景色为浅灰色
                                动画相关：
                                in:send 和 out:receive 是 Svelte 的 crossfade 过渡效果
                                当一个按钮被选中时：
                                旧的激活背景会通过 out:receive 过渡消失
                                新的激活背景会通过 in:send 过渡出现
                                key: "active-settings-tab" 用于标识这些元素是相互关联的，确保它们之间能够正确地进行过 -->
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

                    <!-- 右侧内容区 -->
                    <div class="flex flex-col p-4 rounded-lg gap-4">
                        {#if currentSection === "common"}
                            <!-- <div>
                        <h3 class="text-lg font-medium">通用</h3>
                        <p class="text-muted-foreground text-sm">通用设置</p>
                    </div> -->

                            <!-- <Separator class="my-4" /> -->

                            <!-- 开机启动 -->
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
                                <!-- 语言 -->
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
                                <!-- <h3 class="text-lg font-medium">通知</h3> -->
                                <!-- 通知内容 -->
                                <div class="flex flex-row gap-2 items-center">
                                    <!-- 工作开始 -->
                                    <div class="flex flex-col gap-2">
                                        <Label for="work-start">{$t("app.settings.workTime.title")}</Label>
                                        <div class="flex flex-row gap-2 items-center">
                                            <Input
                                                bind:value={workStart}
                                                type="time"
                                                id="work-start"
                                                class="bg-background h-[24px] w-[72px]"
                                            />
                                            <span class="text-muted-foreground">{$t("app.settings.workTime.to")}</span>
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
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>

<style>
</style>
