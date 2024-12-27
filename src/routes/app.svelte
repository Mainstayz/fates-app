<script lang="ts">
    import type { Route } from "../config";
    import * as Icons from "../icons";
    import { MessageSquare } from "lucide-svelte";
    import Nav from "./nav.svelte";
    import TimelinePage from "./timeline_page.svelte";
    import StatisticsPage from "./statistics_page.svelte";
    import TagsManagerPage from "./tags_manager_page.svelte";
    import RepeatPage from "./repeat_page.svelte";
    import TodoPage from "./todo_page.svelte";
    import OpenAIChatPage from "./openai_chat_page.svelte";
    import SettingsDialog from "./settings_dialog.svelte";

    let timelineComponent: TimelinePage | null = null;
    let statisticsComponent: StatisticsPage | null = null;
    let tagsComponent: TagsManagerPage | null = null;
    let repeatComponent: RepeatPage | null = null;
    let todoComponent: TodoPage | null = null;
    let openaiComponent: OpenAIChatPage | null = null;
    let settingsOpen = false;

    const navCollapsedSize = 50;
    let selectedRoute: string = "timeline";

    const primaryRoutes: Route[] = [
        {
            icon: Icons.CalendarRange,
            variant: "default",
            label: "timeline",
            translationKey: "routes.timeline",
        },
        {
            icon: Icons.CharCombined,
            variant: "default",
            label: "statistics",
            translationKey: "routes.statistics",
        },
        {
            icon: Icons.Tags,
            variant: "default",
            label: "tags",
            translationKey: "routes.tags",
        },
        {
            icon: Icons.Repeat,
            variant: "default",
            label: "repeat",
            translationKey: "routes.repeat",
        },
        {
            icon: Icons.ListTodo,
            variant: "default",
            label: "todo",
            translationKey: "routes.todo",
        },
        {
            icon: MessageSquare,
            variant: "default",
            label: "openai",
            translationKey: "routes.openai",
        },
    ];

    function onRouteSelect(route: string) {
        selectedRoute = route;
    }

    function onSettingsClick() {
        settingsOpen = true;
    }
</script>

<div class="w-full h-full">
    <div class="flex h-full">
        <div class="w-[50px] flex-shrink-0">
            <Nav routes={primaryRoutes} {onRouteSelect} {onSettingsClick} />
        </div>
        <div class="flex-grow">
            {#if selectedRoute === "timeline" || selectedRoute === ""}
                <TimelinePage bind:this={timelineComponent} />
            {/if}
            {#if selectedRoute === "statistics"}
                <StatisticsPage bind:this={statisticsComponent} />
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
            {#if selectedRoute === "openai"}
                <OpenAIChatPage bind:this={openaiComponent} />
            {/if}
        </div>
    </div>
</div>

<SettingsDialog bind:open={settingsOpen} />
