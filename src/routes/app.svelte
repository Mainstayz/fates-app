<script lang="ts">
    import * as Resizable from "$lib/components/ui/resizable";
    import Nav from "./nav.svelte";
    import type { TimelineData } from "$lib/types";
    import TimelinePage from "./timeline_page.svelte";
    import StatisticsPage from "./statistics_page.svelte";
    import { primaryRoutes } from "../config";

    let navCollapsedSize = $state(6);
    let selectedRoute: string = $state("");
    let statisticsComponent: StatisticsPage | null = null;
    let timelineComponent: TimelinePage | null = null;
    let timelineData: TimelineData | null = null;
    $inspect(navCollapsedSize);

    function onLayoutChange(sizes: number[]) {
        console.log("onLayoutChange", sizes);
    }

    function onRouteSelect(route: string) {
        console.log("onRouteSelect", route);

        if (route === "statistics" && timelineComponent) {
            console.log(statisticsComponent);
            timelineData = timelineComponent.getAllItems();
        }

        // 更新选中的路由
        selectedRoute = route;
    }
</script>

<div class="w-full h-full">
    <Resizable.PaneGroup direction="horizontal" class="h-full items-stretch" {onLayoutChange}>
        <Resizable.Pane
        defaultSize={navCollapsedSize}
        collapsedSize={navCollapsedSize}
        minSize={navCollapsedSize}
        maxSize={navCollapsedSize}
        collapsible={true}
    >
        <Nav routes={primaryRoutes} {onRouteSelect} />
    </Resizable.Pane>
    <Resizable.Handle />
    <Resizable.Pane>
        {#if selectedRoute === "timeline" || selectedRoute === ""}
            <TimelinePage bind:this={timelineComponent} />
        {/if}
        {#if selectedRoute === "statistics"}
            <StatisticsPage bind:this={statisticsComponent} items={timelineData?.items ?? []} />
        {/if}
    </Resizable.Pane>
    </Resizable.PaneGroup>
</div>
