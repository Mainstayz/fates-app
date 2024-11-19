<script lang="ts">
    import type { Route } from "../config";
    import { Button } from "$lib/components/ui/button";
    import * as Tooltip from "$lib/components/ui/tooltip/index";
    export let routes: Route[];
    let selectedVarian = "default";
    let noSelectedVariant = "ghost";
</script>

<!--
flex flex-col: 使用 flexbox 布局，子元素垂直排列
gap-2: 子元素之间的间距为 2 个单位
py-2: 上下内边距为 2 个单位
-->
<div class="flex flex-col gap-2 py-4">
    <!--
    grid: 使用网格布局
    gap-1: 网格元素之间的间距为 1 个单位
    px-2: 左右内边距为 2 个单位
    justify-center: 水平居中对齐
    -->
    <nav class="grid gap-2 px-2 justify-center">
        {#each routes as route}
            <Tooltip.Provider>
                <Tooltip.Root delayDuration={0}>
                    <Tooltip.Trigger>
                        <Button size="icon">
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
