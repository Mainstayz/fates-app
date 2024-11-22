<script lang="ts">
    import { invoke } from '@tauri-apps/api/core';
    import * as Dialog from "$lib/components/ui/dialog";

    let { open = $bindable(), ...props} = $props();

    let language = $state("zh"); // 默认中文
    let autoStart = $state(false);
    let checkInterval = $state(2); // 默认 2 小时

    async function toggleAutoStart(enabled: boolean) {
        try {
            await invoke("toggle_autostart", { enabled });
            autoStart = enabled;
        } catch (error) {
            console.error("Failed to toggle autostart:", error);
        }
    }

    // 初始化时获取自启动状态
    async function initSettings() {
        try {
            const isEnabled = await invoke("is_autostart_enabled");
            autoStart = isEnabled as boolean;
        } catch (error) {
            console.error("Failed to get autostart status:", error);
        }
    }

    initSettings();
</script>

<Dialog.Root bind:open={open}>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title>设置</Dialog.Title>
        </Dialog.Header>
        <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
                <label for="language-select" class="text-right">语言</label>
                <select
                    id="language-select"
                    class="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                    bind:value={language}
                >
                    <option value="zh">中文</option>
                    <option value="en">English</option>
                </select>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
                <label for="autostart-checkbox" class="text-right">开机启动</label>
                <div class="col-span-3">
                    <input
                        id="autostart-checkbox"
                        type="checkbox"
                        bind:checked={autoStart}
                        onchange={(e) => toggleAutoStart(e.currentTarget.checked)}
                    />
                </div>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
                <label for="check-interval-input" class="text-right">检测间隔 (小时)</label>
                <input
                    id="check-interval-input"
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    class="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                    bind:value={checkInterval}
                />
            </div>
        </div>
        <Dialog.Footer>
            <Dialog.Close class="btn">关闭</Dialog.Close>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
