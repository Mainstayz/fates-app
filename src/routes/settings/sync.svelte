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
    let testSuccess = $state<boolean>(false);
    let registerLoading = $state<boolean>(false);
    let loginLoading = $state<boolean>(false);
    let testResult = $state<string>("");
    let originalUserName = $state<string>("");
    let originalPassword = $state<string>("");

    // 监听输入变化
    $effect(() => {
        if (initialized && (userName !== originalUserName || password !== originalPassword)) {
            testSuccess = false;
            syncEnabled = false;
        }
    });

    async function registerSuccess() {
        originalUserName = userName;
        originalPassword = password;
        testSuccess = true;
        syncEnabled = true;
        updateConfig();
    }

    async function loginSuccess() {
        originalUserName = userName;
        originalPassword = password;
        testSuccess = true;
        updateConfig();
    }

    async function register() {
        if (!userName || !password) {
            testResult = "请输入用户名和密码";
            return;
        }

        registerLoading = true;
        testResult = "";
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
                testResult = "注册成功";
                await registerSuccess();
            } else {
                testResult = "注册失败: " + (data.message || "未知错误");
            }
        } catch (error) {
            testResult = "错误: " + error;
        } finally {
            registerLoading = false;
        }
    }

    async function login() {
        if (!userName || !password) {
            testResult = "请输入用户名和密码";
            return;
        }

        loginLoading = true;
        testResult = "";
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
                testResult = "登录成功";
                await loginSuccess();
            } else {
                testResult = "登录失败: " + (data.message || "未知错误");
                testSuccess = false;
            }
        } catch (error) {
            testResult = "错误: " + error;
            testSuccess = false;
        } finally {
            loginLoading = false;
        }
    }

    function updateConfig() {
        if (!initialized) return;
        if (syncEnabled && testSuccess) {
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

<div class="flex flex-col gap-6 max-w-md">
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
                {#if testSuccess}
                    <CheckCircle2 class="w-4 h-4 text-green-500" />
                {/if}
            </Label>
            <Input
                bind:value={userName}
                class="bg-background"
                type="text"
                id="sync-userName"
                placeholder="请输入用户名"
            />
        </div>

        <div class="flex flex-col gap-2">
            <Label for="sync-password" class="flex items-center gap-2">
                {$t("app.settings.sync.password")}
                {#if testSuccess}
                    <CheckCircle2 class="w-4 h-4 text-green-500" />
                {/if}
            </Label>
            <Input
                bind:value={password}
                type="password"
                class="bg-background"
                id="sync-password"
                placeholder="请输入密码"
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

                <Button size="sm" onclick={login} disabled={loginLoading || registerLoading} class="flex-1">
                    {#if loginLoading}
                        <LoaderCircle class="w-4 h-4 animate-spin mr-2" />
                    {/if}
                    {$t("app.settings.sync.login")}
                </Button>
            </div>

            <div class="flex items-center space-x-2 bg-muted p-3 rounded-lg">
                <Switch id="sync-enabled" bind:checked={syncEnabled} disabled={!testSuccess} />
                <Label for="sync-enabled" class="flex flex-col gap-1 cursor-pointer">
                    <span class="font-medium">{$t("app.settings.sync.title")}</span>
                    <span class="text-xs text-muted-foreground">
                        {testSuccess ? $t("app.settings.sync.ready") : $t("app.settings.sync.loginToEnable")}
                    </span>
                </Label>
            </div>
        </div>
    </div>

    <!-- {#if testResult}
        <div
            class="flex items-center gap-2 text-sm p-3 rounded-lg {testSuccess
                ? 'bg-green-500/10 text-green-500'
                : 'bg-destructive/10 text-destructive'}"
        >
            {#if testSuccess}
                <CheckCircle2 class="w-4 h-4" />
            {:else}
                <XCircle class="w-4 h-4" />
            {/if}
            {testResult}
        </div>
    {/if} -->
</div>
