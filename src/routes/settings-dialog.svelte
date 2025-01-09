<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import { t } from "svelte-i18n";
    import { cubicInOut } from "svelte/easing";
    import { crossfade } from "svelte/transition";
    import { onMount } from "svelte";
    import CommonSettings from "./settings/common.svelte";
    import NotificationSettings from "./settings/notification.svelte";
    import AiSettings from "./settings/ai.svelte";
    import platform, { isTauri } from "$src/platform";
    import { appConfig } from "$src/app-config";

    let { open = $bindable() } = $props();
    let currentSection = $state("common");
    let updateAvailable = $state(false);
    let UpdateSettings = $state<any>(null);

    onMount(async () => {
        if (isTauri) {
            UpdateSettings = (await import("./settings/update.svelte")).default;
            platform.instance.updater?.checkForUpdates().then((result) => {
                if (result.hasUpdate) {
                    console.log(`[Settings] Update available!!! NEW VERSION: ${result.version}`);
                    updateAvailable = true;
                    appConfig.setUpdateAvailable(true);
                } else {
                    console.log("[Settings] No update available");
                    updateAvailable = false;
                }
            });
        }
    });

    const navItems = $derived([
        { id: "common", title: $t("app.settings.nav.common") },
        { id: "notification", title: $t("app.settings.nav.notification") },
        { id: "ai", title: $t("app.settings.ai.title") },
        ...(isTauri ? [{ id: "update", title: $t("app.settings.update.title") }] : []),
    ]);

    const [send, receive] = crossfade({
        duration: 250,
        easing: cubicInOut,
    });
</script>

<Dialog.Root bind:open>
    <Dialog.Portal>
        <Dialog.Overlay class="bg-[#000000]/20" />
        <Dialog.Content class="sm:max-w-[800px] h-[600px]">
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
                                <div class="relative inline-block">
                                    <span class="relative">{item.title}</span>
                                    {#if item.id === "update" && updateAvailable}
                                        <div class="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full"></div>
                                    {/if}
                                </div>
                            </Button>
                        {/each}
                    </div>

                    <div class="flex flex-col pr-2 rounded-lg gap-4">
                        {#if currentSection === "common"}
                            <CommonSettings />
                        {:else if currentSection === "notification"}
                            <NotificationSettings />
                        {:else if currentSection === "ai"}
                            <AiSettings />
                        {:else if currentSection === "update" && isTauri && UpdateSettings}
                            <UpdateSettings />
                        {/if}
                    </div>
                </div>
            </div>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>

<style>
</style>
