<script lang="ts">
    import { Label } from "$lib/components/ui/label";
    import { Input } from "$lib/components/ui/input";
    import { Switch } from "$lib/components/ui/switch";
    import { t } from "svelte-i18n";
    import { appConfig } from "$src/app-config";

    let aiEnabled = $state<boolean | undefined>(undefined);
    let aiBaseUrl = $state<string | undefined>(undefined);
    let aiModelId = $state<string | undefined>(undefined);
    let aiApiKey = $state<string | undefined>(undefined);

    aiEnabled = appConfig.aiEnabled;
    aiBaseUrl = appConfig.aiBaseUrl;
    aiModelId = appConfig.aiModelId;
    aiApiKey = appConfig.aiApiKey;

    $effect(() => {
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
    });
</script>

<div class="space-y-4">
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
        <Input bind:value={aiModelId} type="text" class="bg-background" id="ai-model-id" placeholder="gpt-3.5-turbo" />
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
