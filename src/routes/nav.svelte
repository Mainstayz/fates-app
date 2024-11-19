<script lang="ts">
    import type { Route } from "../config";
    import { Button } from "$lib/components/ui/button";
    import * as Tooltip from "$lib/components/ui/tooltip/index";

    export let routes: Route[];
    export let onRouteSelect: (route: string) => void;

    // 添加选中的路由状态，默认为第一个路由
    let selectedRoute: Route | null = routes[0];

    // 初始化时触发第一个路由的回调
    onRouteSelect(routes[0].label);

    // 处理按钮点击事件
    function handleRouteClick(route: Route) {
        if (selectedRoute?.label !== route.label) {
            selectedRoute = route;
            onRouteSelect(route.label);
        }
    }
</script>

<div class="flex flex-col gap-2 py-4">
    <nav class="grid gap-2 px-2 justify-center">
        {#each routes as route}
            <Tooltip.Provider>
                <Tooltip.Root delayDuration={0}>
                    <Tooltip.Trigger>
                        <Button
                            size="icon"
                            variant={selectedRoute === route ? "default" : "ghost"}
                            onclick={() => handleRouteClick(route)}
                        >
                            <route.icon />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content side="right" class="flex items-center gap-4">
                        {route.label}
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        {/each}
    </nav>
</div>
