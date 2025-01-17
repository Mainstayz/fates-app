<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Separator } from "$lib/components/ui/separator";
    import { Switch } from "$lib/components/ui/switch";
    import { appConfig } from "$src/app-config";
    import platform from "$src/platform";
    import { LoaderCircle, CheckCircle2, XCircle } from "lucide-svelte";
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";

    // 状态管理
    let syncEnabled = $state<boolean>(false);
    let userName = $state<string>("");
    let password = $state<string>("");
    let initialized = $state<boolean>(false);
    let registerLoading = $state<boolean>(false);
    let loginLoading = $state<boolean>(false);
    let requestStatus = $state<number>(-1); // -1: init State, 0: login success, 1: login failed, 2: register success, 3: register failed
    let responseStr = $state<string>("");
    let originalUserName = $state<string>("");
    let originalPassword = $state<string>("");

    // 监听输入变化
    $effect(() => {
        if (initialized && (userName !== originalUserName || password !== originalPassword)) {
            requestStatus = -1;
            responseStr = "";
            syncEnabled = false;
        }
    });

    async function registerSuccess() {
        originalUserName = userName;
        originalPassword = password;
        requestStatus = 2;
        syncEnabled = true;
        updateConfig();
    }

    async function loginSuccess() {
        originalUserName = userName;
        originalPassword = password;
        requestStatus = 0;
        updateConfig();
    }

    async function register() {
        requestStatus = -1;
        if (!userName || !password) {
            requestStatus = 3;
            responseStr = $t("app.settings.sync.enterCredentials");
            return;
        }

        registerLoading = true;
        responseStr = "";
        try {
            const url = `https://fates-app.com/api/register`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username: userName, password: password }),
            });
            const data = await response.json();
            if (response.ok) {
                responseStr = $t("app.settings.sync.registerSuccess");
                await registerSuccess();
            } else {
                responseStr =
                    $t("app.settings.sync.registerFailed") +
                    ": " +
                    (data.message || $t("app.settings.sync.unknownError"));
                requestStatus = 3;
            }
        } catch (error) {
            responseStr = $t("app.settings.sync.error") + ": " + error;
            requestStatus = 3;
        } finally {
            registerLoading = false;
        }
    }

    async function login() {
        if (requestStatus === 0) {
            return;
        }

        requestStatus = -1;
        if (!userName || !password) {
            requestStatus = 1;
            responseStr = $t("app.settings.sync.enterCredentials");
            return;
        }

        loginLoading = true;
        responseStr = "";
        try {
            const url = `https://fates-app.com/api/login`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username: userName, password: password }),
            });
            const data = await response.json();
            if (response.ok) {
                responseStr = $t("app.settings.sync.loginSuccess");
                await loginSuccess();
            } else {
                responseStr =
                    $t("app.settings.sync.loginFailed") + ": " + (data.message || $t("app.settings.sync.unknownError"));
                requestStatus = 1;
            }
        } catch (error) {
            responseStr = $t("app.settings.sync.error") + ": " + error;
            requestStatus = 1;
        } finally {
            loginLoading = false;
        }
    }

    function updateConfig() {
        if (!initialized) return;
        if (syncEnabled && (requestStatus === 0 || requestStatus === 2 || requestStatus === -1)) {
            console.log("[Settings] Sync enabled, enabling sync ..");
            platform.instance.storage.enableSync();
        } else {
            console.log("[Settings] Sync disabled, disabling sync ..");
            platform.instance.storage.disableSync();
        }
        appConfig.storeValue("syncEnabled", syncEnabled.toString(), true);
        appConfig.storeValue("userName", userName, true);
        appConfig.storeValue("password", password, true);
    }

    $effect(() => {
        updateConfig();
    });

    onMount(async () => {
        userName = await appConfig.getStoredValue("userName", true);
        password = await appConfig.getStoredValue("password", true);
        originalUserName = userName;
        originalPassword = password;

        let syncEnabledStr = await appConfig.getStoredValue("syncEnabled", true);
        syncEnabled = syncEnabledStr === "true";

        if (userName && password && syncEnabled) {
            await login();
        }

        initialized = true;
    });
</script>

<div class="flex flex-col gap-4 max-w-md">
    <div class="flex flex-col gap-2">
        <Label class="text-lg font-medium">{$t("app.settings.sync.configTitle")}</Label>
        <p class="text-muted-foreground text-sm">
            {$t("app.settings.sync.configDescription")}
        </p>
        <p class="text-muted-foreground text-sm">
            {$t("app.settings.sync.configDescription1")}
        </p>
    </div>

    <Separator />

    <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
            <Label for="sync-userName" class="flex items-center gap-2">
                {$t("app.settings.sync.userName")}
                {#if requestStatus === 0 || requestStatus === 2}
                    <CheckCircle2 class="w-4 h-4 text-green-500" />
                {/if}
            </Label>
            <Input
                bind:value={userName}
                class="bg-background"
                type="text"
                id="sync-userName"
                placeholder={$t("app.settings.sync.userNamePlaceholder")}
            />
        </div>

        <div class="flex flex-col gap-2">
            <Label for="sync-password" class="flex items-center gap-2">
                {$t("app.settings.sync.password")}
                {#if requestStatus === 0 || requestStatus === 2}
                    <CheckCircle2 class="w-4 h-4 text-green-500" />
                {/if}
            </Label>
            <Input
                bind:value={password}
                type="password"
                class="bg-background"
                id="sync-password"
                placeholder={$t("app.settings.sync.passwordPlaceholder")}
            />
        </div>

        <div class="flex flex-col gap-4">
            <div class="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onclick={register}
                    disabled={registerLoading || loginLoading}
                    class="flex-1"
                >
                    {#if registerLoading}
                        <LoaderCircle class="w-4 h-4 animate-spin mr-2" />
                    {/if}
                    {$t("app.settings.sync.register")}
                </Button>

                <Button
                    size="sm"
                    onclick={login}
                    disabled={loginLoading || registerLoading || requestStatus == 0}
                    class="flex-1"
                >
                    {#if loginLoading}
                        <LoaderCircle class="w-4 h-4 animate-spin mr-2" />
                    {/if}
                    {#if requestStatus === 0}
                        <CheckCircle2 class="w-4 h-4 text-green-500 mr-2" />
                        {$t("app.settings.sync.loginSuccess")}
                    {:else}
                        {$t("app.settings.sync.login")}
                    {/if}
                </Button>
            </div>

            {#if requestStatus === 0 || requestStatus === 2}
                <div class="flex items-center space-x-2 bg-muted p-3 rounded-lg">
                    <Switch
                        id="sync-enabled"
                        bind:checked={syncEnabled}
                        disabled={!(requestStatus === 0 || requestStatus === 2)}
                    />
                    <Label for="sync-enabled" class="flex flex-col gap-1 cursor-pointer">
                        <span class="font-medium">
                            {#if syncEnabled}
                                {$t("app.settings.sync.synced")}
                            {:else}
                                {$t("app.settings.sync.clickToEnable")}
                            {/if}
                        </span>
                        <span class="text-xs text-muted-foreground">
                            {#if requestStatus === 0 || requestStatus === 2}
                                {#if syncEnabled}
                                    {$t("app.settings.sync.synchronizing")}
                                {:else}
                                    {$t("app.settings.sync.ready")}
                                {/if}
                            {:else}
                                {$t("app.settings.sync.loginToEnable")}
                            {/if}
                        </span>
                    </Label>
                </div>
            {:else if responseStr}
                <div class="flex items-center gap-2 text-sm p-3 rounded-lg bg-destructive/10 text-destructive">
                    <XCircle class="w-4 h-4" />
                    {responseStr}
                </div>
            {/if}
        </div>
    </div>
</div>
