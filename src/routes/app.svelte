<script lang="ts">
    import * as Resizable from "$lib/components/ui/resizable";
    import Nav from "./nav.svelte";
    import type { TimelineData } from "$lib/types";
    import TimelinePage from "./timeline_page.svelte";
    import StatisticsPage from "./statistics_page.svelte";
    import SettingsDialog from "./settings_dialog.svelte";
    import { primaryRoutes } from "../config";

    let navCollapsedSize = $state(5);
    let selectedRoute = $state("");
    let settingsOpen = $state(false);
    let statisticsComponent = $state<StatisticsPage | null>(null);
    let timelineComponent = $state<TimelinePage | null>(null);
    let timelineData = $state<TimelineData | null>(null);

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

    function onSettingsClick() {
        settingsOpen = true;
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
            <Nav routes={primaryRoutes} {onRouteSelect} {onSettingsClick} />
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

<SettingsDialog bind:open={settingsOpen} />
