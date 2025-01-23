<script lang="ts">
    import { MessageSquare } from "lucide-svelte";
    import type { Route } from "../config";
    import * as Icons from "../icons";
    import Nav from "./nav.svelte";
    import OpenAIChatPage from "./openai-chat-page.svelte";
    import RepeatPage from "./repeat-page.svelte";
    import SettingsDialog from "./settings-dialog.svelte";
    import StatisticsPage from "./statistics-page.svelte";
    import TimelinePage from "./timeline-page.svelte";
    import TodoPage from "./todo-page.svelte";
    import WeekReportPage from "./week-report-page.svelte";
    import ImportDialog from "./import-dialog.svelte";

    let timelineComponent: TimelinePage | null = null;
    let statisticsComponent: StatisticsPage | null = null;
    let repeatComponent: RepeatPage | null = null;
    let todoComponent: TodoPage | null = null;
    let openaiComponent: OpenAIChatPage | null = null;
    let weekReportComponent: WeekReportPage | null = null;
    let settingsOpen = false;

    let importOpen = false;
    let selectedRoute: string = "timeline";

    const primaryRoutes: Route[] = [
        {
            icon: Icons.CalendarRange,
            variant: "default",
            label: "timeline",
            type: "route",
            translationKey: "routes.timeline",
        },

        // {
        //     icon: Icons.Tags,
        //     variant: "default",
        //     label: "tags",
        //     translationKey: "routes.tags",
        // },
        {
            icon: Icons.ListTodo,
            variant: "default",
            label: "todo",
            type: "route",
            translationKey: "routes.todo",
        },
        {
            icon: Icons.Repeat,
            variant: "default",
            label: "repeat",
            type: "route",
            translationKey: "routes.repeat",
        },

        {
            icon: Icons.CharCombined,
            variant: "default",
            label: "statistics",
            type: "route",
            translationKey: "routes.statistics",
        },
        {
            icon: Icons.PencilLine,
            variant: "default",
            label: "week_report",
            type: "route",
            translationKey: "routes.week_report",
        },
        // {
        //     icon: MessageSquare,
        //     variant: "default",
        //     label: "openai",
        //     translationKey: "routes.openai",
        // },
        {
            icon: Icons.Import,
            variant: "default",
            label: "import",
            type: "custom",
            translationKey: "routes.import",
        },
        {
            icon: Icons.Settings,
            variant: "default",
            label: "settings",
            type: "settings",
            translationKey: "routes.settings",
        },
    ];

    function onRouteSelect(route: string) {
        selectedRoute = route;
    }

    function onConfigClick(route: string) {
        console.log("onConfigClick", route);
        if (route === "import") {
            importOpen = true;
        }
    }

    function onSettingsClick() {
        settingsOpen = true;
    }
</script>

<div class="w-full h-full">
    <div class="flex h-full">
        <div class="w-[50px] flex-shrink-0">
            <Nav routes={primaryRoutes} {onRouteSelect} {onConfigClick} {onSettingsClick} />
        </div>
        <div class="flex-grow">
            {#if selectedRoute === "timeline" || selectedRoute === ""}
                <TimelinePage bind:this={timelineComponent} />
            {/if}
            {#if selectedRoute === "statistics"}
                <StatisticsPage bind:this={statisticsComponent} />
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
            {#if selectedRoute === "week_report"}
                <WeekReportPage bind:this={weekReportComponent} />
            {/if}
        </div>
    </div>
</div>

<SettingsDialog bind:open={settingsOpen} />
<ImportDialog bind:open={importOpen} />
