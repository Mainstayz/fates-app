<script lang="ts">
    import type { Route } from "../config";
    import { Button } from "$lib/components/ui/button";
    import * as Tooltip from "$lib/components/ui/tooltip/index";
    import { t } from "svelte-i18n";

    export let routes: Route[];
    export let onRouteSelect: (route: string) => void;
    export let onSettingsClick: () => void;

    // 添加选中的路由状态，默认为第一个路由
    let selectedRoute: Route | null = routes[0];

    // 初始化时触发第一个路由的回调
    onRouteSelect(routes[0].label);

    // 将设置路由和其他路由分开
    $: mainRoutes = routes.filter((route) => route.label !== "settings");
    $: settingsRoute = routes.find((route) => route.label === "settings");

    // 处理主导航按钮点击事件
    function handleRouteClick(route: Route) {
        if (selectedRoute?.label !== route.label) {
            selectedRoute = route;
            onRouteSelect(route.label);
        }
    }

    // 处理设置按钮点击事件
    function handleSettingsClick() {
        if (settingsRoute) {
            onSettingsClick();
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
            <Tooltip.Provider>
                <Tooltip.Root delayDuration={0}>
                    <Tooltip.Trigger>
                        <Button size="icon" variant="secondary" onclick={handleSettingsClick}>
                            <settingsRoute.icon />
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
