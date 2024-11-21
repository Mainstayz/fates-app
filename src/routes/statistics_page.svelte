<script lang="ts">
    import Statistics from "$lib/components/Statistics.svelte";
    import type { TimelineItem } from "$lib/types";
    let { items }: { items: TimelineItem[] } = $props();
</script>

<div class="flex flex-col h-full">
    <div class="px-6 pt-6">
        <h2 class="text-2xl font-bold tracking-tight">Welcome back!</h2>
        <p class="text-muted-foreground">Here's a list of your tasks for this month!</p>
    </div>
    <div class="flex-1 p-6">
        <Statistics {items} />
    </div>
</div>
