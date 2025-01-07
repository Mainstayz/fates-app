<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import { t } from "svelte-i18n";
    import { check } from "@tauri-apps/plugin-updater";
    import { relaunch } from "@tauri-apps/plugin-process";
    import { getVersion } from "@tauri-apps/api/app";
    import { onMount } from "svelte";

    let currentVersion = $state<string>("");
    let updateAvailable = $state(false);
    let updateInProgress = $state(false);
    let updateStatus = $state<string>($t("app.settings.update.unknown"));

    export async function initSettings() {
        currentVersion = await getVersion();
    }

    onMount(() => {
        initSettings();
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
</script>

<div class="space-y-4">
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
            {updateInProgress ? $t("app.settings.update.checking") : $t("app.settings.update.check")}
        </Button>
    </div>
</div>
