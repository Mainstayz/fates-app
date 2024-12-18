<script lang="ts">
    import Statistics from "$lib/components/Statistics.svelte";
    import { Label } from "$lib/components/ui/label";
    import { getAllMatters } from "../store";
    import type { TimelineItem } from "$lib/types";
    import { onMount } from "svelte";

    let timelineItems: any[] = $state([]);
    onMount(async () => {
        const matters = await getAllMatters();
        timelineItems = matters.map((matter) => ({
            id: matter.id,
            content: matter.title,
            start: matter.start_time,
            end: matter.end_time,
            tags: matter.tags?.split(",").filter(Boolean) || [],
            type_: matter.type_,
        }));
    });
</script>

<div class="flex flex-col h-full">
    <div class="flex flex-col px-6 pt-6 gap-4">
        <Label class="text-2xl font-bold tracking-tight">统计</Label>
        <Label class="text-base text-muted-foreground">一张用文字编织的网，捕捉转瞬即逝的时光。</Label>
    </div>
    <div class="flex-1 p-6">
        <Statistics items={timelineItems} />
    </div>
</div>
