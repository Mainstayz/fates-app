<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Tooltip from "$lib/components/ui/tooltip/index";
    import { t } from "svelte-i18n";
    import type { Route } from "../config";
    import { appConfig, type ThemeType } from "$src/app-config";
    import { Sun, Moon, Github } from "lucide-svelte";
    import { setMode } from "mode-watcher";
    import platform from "$src/platform";
    import { onMount } from "svelte";

    export let routes: Route[];
    export let onRouteSelect: (route: string) => void;
    export let onSettingsClick: () => void;

    let selectedRoute: Route | null = routes[0];

    onRouteSelect(routes[0].label);

    $: mainRoutes = routes.filter((route) => route.label !== "settings");
    $: settingsRoute = routes.find((route) => route.label === "settings");
    $: updateAvailable = false;

    function checkForUpdates() {
        if (platform.instance.updater) {
            platform.instance.updater?.checkForUpdates().then((result) => {
                if (result.hasUpdate) {
                    console.log(`[Nav] Update available!!! NEW VERSION: ${result.version}`);
                    appConfig.setUpdateAvailable(true);
                    updateAvailable = true;
                } else {
                    console.log("[Nav] No update available");
                    appConfig.setUpdateAvailable(false);
                    updateAvailable = false;
                }
            });
        } else {
            console.log("[Nav] Invalid Updater module");
        }
    }

    onMount(() => {
        checkForUpdates();
    });

    function handleRouteClick(route: Route) {
        if (selectedRoute?.label !== route.label) {
            selectedRoute = route;
            onRouteSelect(route.label);
        }
    }

    function toggleTheme() {
        let theme = appConfig.getConfig().theme === "dark" ? "light" : "dark";
        setMode(theme as "light" | "dark");
        appConfig.setTheme(theme as ThemeType);
        console.log("[Nav] Toggle theme: ", theme);
    }

    function handleSettingsClick() {
        if (settingsRoute) {
            onSettingsClick();
        }
    }

    function gotoGithub() {
        try {
            platform.instance.openUrl("https://github.com/Mainstayz/fates-app");
        } catch (error) {
            console.error("Failed to open url: ", error);
        }
    }
</script>

<div class="flex flex-col h-full">
    <nav class="grid gap-2 py-4 justify-center">
        {#each mainRoutes as route}
            <Tooltip.Provider>
                <Tooltip.Root delayDuration={0}>
                    <Tooltip.Trigger>
                        <Button
                            size="icon"
                            variant={selectedRoute === route ? "default" : "secondary"}
                            onclick={() => handleRouteClick(route)}
                        >
                            <route.icon />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content side="right" class="flex items-center gap-4">
                        {$t(route.translationKey)}
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        {/each}
    </nav>

    {#if settingsRoute}
        <nav class="grid gap-2 mt-auto pb-4 justify-center">
            <Button size="icon" variant="secondary" onclick={gotoGithub}>
                <Github />
            </Button>
            <Button size="icon" variant="secondary" onclick={toggleTheme}>
                <Sun class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon
                    class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                />
            </Button>
            <Tooltip.Provider>
                <Tooltip.Root delayDuration={0}>
                    <Tooltip.Trigger>
                        <Button size="icon" variant="secondary" onclick={handleSettingsClick}>
                            <div class="relative">
                                <settingsRoute.icon />
                                {#if updateAvailable}
                                    <div class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                                {/if}
                            </div>
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content side="right" class="flex items-center gap-4">
                        {$t(settingsRoute.translationKey)}
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </nav>
    {/if}
</div>
