<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Tooltip from "$lib/components/ui/tooltip/index";
    import { t } from "svelte-i18n";
    import type { Route } from "../config";
    import { appConfig } from "$src/app-config";
    import { default as Github } from "lucide-svelte/icons/github";

    export let routes: Route[];
    export let onRouteSelect: (route: string) => void;
    export let onSettingsClick: () => void;

    let selectedRoute: Route | null = routes[0];

    onRouteSelect(routes[0].label);

    $: mainRoutes = routes.filter((route) => route.label !== "settings");
    $: settingsRoute = routes.find((route) => route.label === "settings");
    $: updateAvailable = $appConfig.updateAvailable;

    function handleRouteClick(route: Route) {
        if (selectedRoute?.label !== route.label) {
            selectedRoute = route;
            onRouteSelect(route.label);
        }
    }

    function handleSettingsClick() {
        if (settingsRoute) {
            onSettingsClick();
        }
    }

    function gotoGithub() {
        window.open("https://github.com/Mainstayz/fates-app", "_blank");
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
