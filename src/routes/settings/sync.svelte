<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Separator } from "$lib/components/ui/separator";
    import { Switch } from "$lib/components/ui/switch";
    import { appConfig } from "$src/app-config";
    import { OpenAIClient } from "$src/openai";
    import { LoaderCircle, Check, X, AlertCircle } from "lucide-svelte";
    import { t } from "svelte-i18n";
    import { onMount } from "svelte";
    import platform from "$src/platform";

    // 当前配置状态
    let syncEnabled = $state<boolean>(false);
    let userName = $state<string>("");
    let password = $state<string>("");
    let initialized = $state<boolean>(false);

    let testSuccess = $state<boolean>(false);
    let registerLoading = $state<boolean>(false);

    let loginLoading = $state<boolean>(false);
    let testResult = $state<string>("");

    async function registerSuccess() {}
    async function loginSuccess() {}

    async function register() {
        registerLoading = true;
        testResult = "";
        try {
            const url = `http://199.180.116.236:4152/api/register`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username: userName, password: password }),
            });
            const data = await response.json();
            console.log("Register response:", data);
            if (response.ok) {
                testResult = "Register success";
                registerSuccess();
            } else {
                testResult = "Register failed";
            }
        } catch (error) {
            testResult = "Error: " + error;
        } finally {
            registerLoading = false;
        }
    }

    async function login() {
        loginLoading = true;
        testResult = "";
        try {
            const url = `http://199.180.116.236:4152/api/login`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username: userName, password: password }),
            });
            const data = await response.json();
            console.log("Login response:", data);
            if (response.ok) {
                testResult = "Login success";
                testSuccess = true;
                loginSuccess();
            } else {
                testResult = "Login failed";
                testSuccess = false;
            }
        } catch (error) {
            testResult = "Error: " + error;
        } finally {
            loginLoading = false;
        }
    }

    function updateConfig() {
        if (!initialized) return;
        if (syncEnabled) {
            platform.instance.storage.enableSync();
        } else {
            platform.instance.storage.disableSync();
        }
        appConfig.storeValue("userName", userName, false);
        appConfig.storeValue("password", password, false);
    }

    $effect(() => {
        updateConfig();
    });

    onMount(async () => {
        // 从配置中获取用户名和密码
        userName = await appConfig.getStoredValue("userName", true);
        password = await appConfig.getStoredValue("password", true);
        // 获取同步状态
        syncEnabled = platform.instance.storage.isSyncEnabled();
        initialized = true;
    });
</script>

<div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
        <Label class="text-lg font-medium">{$t("app.settings.sync.configTitle")}</Label>
        <p class="text-muted-foreground text-xs">
            {$t("app.settings.sync.configDescription")}
        </p>
        <p class="text-muted-foreground text-xs">
            {$t("app.settings.sync.configDescription1")}
        </p>
    </div>
    <Separator />
    <div class="flex items-center justify-between space-x-2 my-4">
        <Label for="sync-enabled" class="flex flex-col flex-1 space-y-1 font-bold">
            <span>{$t("app.settings.sync.enabled")}</span>
        </Label>
        <Switch
            id="sync-enabled"
            bind:checked={syncEnabled}
            disabled={userName.length === 0 || password.length === 0}
        />
    </div>
    <div class="flex flex-col gap-2">
        <Label for="sync-userName">{$t("app.settings.sync.userName")}</Label>
        <Input bind:value={userName} class="bg-background" type="text" id="sync-userName" />
    </div>
    <div class="flex flex-col gap-2">
        <Label for="sync-password">{$t("app.settings.sync.password")}</Label>
        <Input bind:value={password} type="password" class="bg-background" id="sync-password" />
    </div>
    <div class="flex flex-row gap-2">
        <div class="flex flex-1 space-x-2 items-center">
            <Button size="sm" onclick={register} disabled={registerLoading}>
                {#if registerLoading}
                    <LoaderCircle class="w-4 h-4 animate-spin" />
                {:else}
                    {$t("app.settings.sync.register")}
                {/if}
            </Button>
            {#if testResult.length > 0}
                <Label class="flex-1 text-xs font-normal leading-snug">
                    {testResult}
                </Label>
            {/if}
        </div>
    </div>
</div>
