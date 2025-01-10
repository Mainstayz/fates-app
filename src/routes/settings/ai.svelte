<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Separator } from "$lib/components/ui/separator";
    import { Switch } from "$lib/components/ui/switch";
    import { appConfig } from "$src/app-config";
    import { OpenAIClient } from "$src/openai";
    import { LoaderCircle } from "lucide-svelte";
    import { t } from "svelte-i18n";

    // 当前配置状态
    let aiEnabled = $state<boolean>(appConfig.getAIConfig().enabled);
    let aiBaseUrl = $state<string>(appConfig.getAIConfig().baseUrl);
    let aiModelId = $state<string>(appConfig.getAIConfig().modelId);
    let aiApiKey = $state<string>(appConfig.getAIConfig().apiKey);

    // 上一次的配置状态
    let prevConfig = $state<{
        enabled: boolean;
        baseUrl: string;
        modelId: string;
        apiKey: string;
    }>({
        enabled: aiEnabled,
        baseUrl: aiBaseUrl,
        modelId: aiModelId,
        apiKey: aiApiKey,
    });

    let switchEnabled = $state<boolean>(false);
    let aiTestResult = $state<string>("");
    let aiTestLoading = $state<boolean>(false);

    function updateConfig() {
        if (prevConfig.enabled !== aiEnabled) {
            appConfig.setAIConfig({
                enabled: aiEnabled,
            });
            prevConfig.enabled = aiEnabled;
        }
        if (prevConfig.baseUrl !== aiBaseUrl) {
            appConfig.setAIConfig({
                baseUrl: aiBaseUrl,
            });
            prevConfig.baseUrl = aiBaseUrl;
        }
        if (prevConfig.modelId !== aiModelId) {
            appConfig.setAIConfig({
                modelId: aiModelId,
            });
            prevConfig.modelId = aiModelId;
        }
        if (prevConfig.apiKey !== aiApiKey) {
            appConfig.setAIConfig({
                apiKey: aiApiKey,
            });
            prevConfig.apiKey = aiApiKey;
        }
    }

    $effect(() => {
        if (aiBaseUrl.length > 0 && aiModelId.length > 0 && aiApiKey.length > 0) {
            switchEnabled = true;
        } else {
            switchEnabled = false;
            aiEnabled = false;
        }

        updateConfig();
    });

    async function test() {
        aiTestLoading = true;
        let client = new OpenAIClient({
            apiKey: aiApiKey,
            baseURL: aiBaseUrl || undefined,
            defaultModel: aiModelId,
        });

        let sessionId = "test";
        await client.setSystemPrompt(sessionId, "You are a helpful assistant.");

        let message = `hello, how are you?`;

        try {
            aiTestResult = "";
            await client.sendMessage(sessionId, message, {
                stream: true,
                streamCallbacks: {
                    onMessage: (message) => {
                        aiTestResult += message;
                    },
                },
            });
        } catch (error) {
            aiTestResult = "Error: " + error;
        } finally {
            aiTestLoading = false;
        }
    }
</script>

<div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
        <Label class="text-lg font-medium">{$t("app.settings.ai.configTitle")}</Label>
        <p class="text-muted-foreground text-sm">
            {$t("app.settings.ai.configDescription")}
        </p>
    </div>
    <Separator />
    <div class="flex items-center justify-between space-x-2">
        <Label for="ai-enabled" class="flex flex-col flex-1 space-y-1">
            <span>{$t("app.settings.ai.enabled")}</span>
            <span class="text-muted-foreground text-xs font-normal leading-snug">
                {$t("app.settings.ai.enableDescription")}
            </span>
        </Label>
        <Switch id="ai-enabled" bind:checked={aiEnabled} disabled={!switchEnabled} />
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
    <div class="flex flex-row gap-2">
        <Button size="sm" onclick={test}>
            {#if aiTestLoading}
                <LoaderCircle class="w-4 h-4 animate-spin" />
            {:else}
                {$t("app.settings.ai.test")}
            {/if}
        </Button>
        <p class="flex-1 text-muted-foreground text-xs font-normal leading-snug">
            {aiTestResult}
        </p>
    </div>
</div>
