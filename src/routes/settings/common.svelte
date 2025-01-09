<script lang="ts">
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import { Switch } from "$lib/components/ui/switch";
    import { appConfig } from "$src/app-config";
    import platform from "$src/platform";
    import { onMount } from "svelte";
    import { locale, t } from "svelte-i18n";

    let language = $state<string | undefined>(undefined);
    let autoStart = $state(false);
    let initialized = $state(false);

    const languages = [
        { value: "zh", label: "中文" },
        { value: "en", label: "English" },
    ] as const;

    function getLanguageLabel(value: string | undefined) {
        if (!value) return $t("app.settings.language");
        return languages.find((l) => l.value === value)?.label ?? $t("app.settings.language");
    }

    async function toggleAutoStart(enabled: boolean) {
        console.log("setting auto start to:", enabled);
        try {
            if (enabled) {
                await platform.instance.autostart?.enable();
            } else {
                await platform.instance.autostart?.disable();
            }
        } catch (error) {
            console.error("setting auto start to:", enabled, "failed:", error);
        }
    }

    export async function initSettings() {
        console.log("init common settings");
        language = appConfig.language;
        if (language == "") {
            language = "zh";
            appConfig.language = language;
        }
        try {
            autoStart = (await platform.instance.autostart?.isEnabled()) ?? false;
        } catch (error) {
            autoStart = false;
            console.warn("Failed to get settings:", error);
        }
        initialized = true;
    }

    function setLanguage(value: string) {
        language = value;
        appConfig.language = value;
        locale.set(value);
    }

    onMount(() => {
        initSettings();
    });
</script>

<div class="flex flex-col gap-4">
    <div class="flex items-center justify-between space-x-2">
        <Label for="necessary" class="flex flex-col flex-1 space-y-1">
            <span>{$t("app.settings.autoStart.title")}</span>
            <span class="text-muted-foreground text-xs font-normal leading-snug">
                {$t("app.settings.autoStart.description")}
            </span>
        </Label>
        <Switch id="necessary" checked={autoStart} onCheckedChange={toggleAutoStart} />
    </div>

    <div class="flex flex-col gap-2">
        <Label for="language">
            <span>{$t("app.settings.language")}</span>
        </Label>

        <Select.Root type="single" value={language} onValueChange={setLanguage}>
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
</div>
