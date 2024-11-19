<script lang="ts">
    import * as Resizable from "$lib/components/ui/resizable";
    import Nav from "./nav.svelte";
    import TimelinePage from "./timeline_page.svelte";
    import { primaryRoutes } from "../config";
    let navCollapsedSize = $state(6);
    $inspect(navCollapsedSize);
    function onLayoutChange(sizes: number[]) {
        console.log("onLayoutChange", sizes);
    }
</script>

<Resizable.PaneGroup direction="horizontal" class="h-full items-stretch" {onLayoutChange}>
    <Resizable.Pane
        defaultSize={navCollapsedSize}
        collapsedSize={navCollapsedSize}
        minSize={navCollapsedSize}
        maxSize={navCollapsedSize}
        collapsible={true}
    >
        <Nav routes={primaryRoutes} />
    </Resizable.Pane>
    <Resizable.Handle />
    <Resizable.Pane>
        <TimelinePage />
    </Resizable.Pane>
</Resizable.PaneGroup>
