<script lang="ts">
    import * as Resizable from "$lib/components/ui/resizable";
    import Nav from "./nav.svelte";
    import type { TimelineData } from "$lib/types";
    import TimelinePage from "./timeline_page.svelte";
    import StatisticsPage from "./statistics_page.svelte";
    import SettingsDialog from "./settings_dialog.svelte";
    import RepeatPage from "./repeat_page.svelte";
    import TodoPage from "./todo_page.svelte";
    import TagsManagerPage from "./tags_manager_page.svelte";
    import { primaryRoutes } from "../config";
    import { check } from "@tauri-apps/plugin-updater";
    import { relaunch } from "@tauri-apps/plugin-process";
    import { onMount } from "svelte";

    let navCollapsedSize = $state(5);
    let selectedRoute = $state("");
    let settingsOpen = $state(true);
    let statisticsComponent = $state<StatisticsPage | null>(null);
    let timelineComponent = $state<TimelinePage | null>(null);
    let tagsComponent = $state<TagsManagerPage | null>(null);
    let repeatComponent = $state<RepeatPage | null>(null);
    let timelineData = $state<TimelineData | null>(null);
    let todoComponent = $state<TodoPage | null>(null);

    $inspect(navCollapsedSize);

    function onLayoutChange(sizes: number[]) {
        console.log("onLayoutChange", sizes);
    }

    function onRouteSelect(route: string) {
        if (route === "statistics" && timelineComponent) {
            let allItems = timelineComponent.getAllItems();
            console.log("Switch statistics :", allItems);
            timelineData = allItems;
        }

        // 更新选中的路由
        selectedRoute = route;
    }

    function onSettingsClick() {
        settingsOpen = true;
    }

    // 添加自动更新代码
    async function checkForUpdates() {
        const update = await check({
            timeout: 30000 /* milliseconds */,
        });
        if (update) {
            console.log(`found update ${update.version} from ${update.date} with notes ${update.body}`);
            let downloaded = 0;
            let contentLength = 0; // Initialize contentLength to 0
            // alternatively we could also call update.download() and update.install() separately
            await update.downloadAndInstall((event) => {
                switch (event.event) {
                    case "Started":
                        contentLength = event.data.contentLength ?? 0; // Ensure contentLength is a number
                        console.log(`started downloading ${contentLength} bytes`);
                        break;
                    case "Progress":
                        downloaded += event.data.chunkLength;
                        console.log(`downloaded ${downloaded} from ${contentLength}`);
                        break;
                    case "Finished":
                        console.log("download finished");
                        break;
                }
            });

            console.log("update installed");
            await relaunch();
        }
    }

    onMount(() => {
        try {
            checkForUpdates();
        } catch (error) {
            console.error("Error checking for updates", error);
        }
    });
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
            {#if selectedRoute === "tags"}
                <TagsManagerPage bind:this={tagsComponent} />
            {/if}
            {#if selectedRoute === "repeat"}
                <RepeatPage bind:this={repeatComponent} />
            {/if}
            {#if selectedRoute === "todo"}
                <TodoPage bind:this={todoComponent} />
            {/if}
        </Resizable.Pane>
    </Resizable.PaneGroup>
</div>

<SettingsDialog bind:open={settingsOpen} />
