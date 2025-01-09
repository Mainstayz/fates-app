<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import { updater, type UpdateProgress } from "$src/tauri/updater.svelte";
    import { Loader2 } from "lucide-svelte";
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";
    import platform from "$src/platform";

    let currentVersion = $state<string>("");
    let updateAvailable = $state(false);
    let updateInProgress = $state(false);
    let updateStatus = $state<string>($t("app.settings.update.unknown"));

    const unsubscribe = updater.subscribe((progress: UpdateProgress) => {
        switch (progress.status) {
            case "checking":
                updateStatus = $t("app.settings.update.checking");
                break;
            case "available":
                updateStatus = $t("app.settings.update.available", {
                    values: { version: progress.version },
                });
                break;
            case "downloading":
                updateStatus = $t("app.settings.update.downloading", {
                    values: {
                        downloaded: (progress.downloaded ?? 0 / 1024 / 1024).toFixed(1),
                        total: (progress.total ?? 0 / 1024 / 1024).toFixed(1),
                    },
                });
                break;
            case "installing":
                updateStatus = $t("app.settings.update.installing");
                break;
            case "restarting":
                updateStatus = $t("app.settings.update.restarting");
                break;
            case "latest":
                updateStatus = $t("app.settings.update.latest");
                break;
            case "error":
                updateStatus = $t("app.settings.update.error");
                break;
        }
    });

    export async function initSettings() {
        currentVersion = await platform.instance.getVersion();
    }

    onMount(() => {
        initSettings();
        checkForUpdates().then(() => {
            // 检查更新
            console.log("check for updates finished");
        });
        return () => {
            unsubscribe();
        };
    });

    async function downloadAndInstall() {
        await updater.downloadAndInstall();
        await updater.restart();
    }

    async function checkForUpdates() {
        updateInProgress = false;
        try {
            console.log("check for updates ...");
            const { hasUpdate, version } = await updater.checkForUpdates();
            updateAvailable = hasUpdate;

            if (hasUpdate && version) {
                updateStatus = $t("app.settings.update.available", {
                    values: { version: version },
                });
            }
        } catch (error) {
            console.error("检查更新失败：", error);
            updateStatus = $t("app.settings.update.error");
        }
    }

    function update() {
        if (updateAvailable) {
            updateInProgress = true;
            downloadAndInstall().then(() => {
                updateInProgress = false;
                updateAvailable = false;
            });
        } else {
            checkForUpdates().then(() => {});
        }
    }
</script>

<div class="space-y-4">
    <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
            <Label>{$t("app.settings.update.currentVersion")}</Label>
            <div class="text-muted-foreground">{currentVersion}</div>
        </div>
        <div class="flex flex-col gap-2">
            <Label>{$t("app.settings.update.status")}</Label>
            <div class={updateAvailable ? "text-red-500" : "text-muted-foreground"}>{updateStatus}</div>
        </div>
        <Button onclick={update} disabled={updateInProgress}>
            {#if updateInProgress}
                <Loader2 class="w-4 h-4 animate-spin" />
            {:else}
                {updateAvailable ? $t("app.settings.update.installAndRestart") : $t("app.settings.update.check")}
            {/if}
        </Button>
    </div>
</div>
