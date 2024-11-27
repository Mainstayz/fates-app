<script lang="ts">
    import Statistics from "$lib/components/Statistics.svelte";
    import type { TimelineItem } from "$lib/types";
    let { items }: { items: TimelineItem[] } = $props();
</script>

<div class="flex flex-col h-full">
    <div class="px-6 pt-6">
        <h2 class="text-2xl font-bold tracking-tight">统计</h2>
        <p class="text-muted-foreground">一张用文字编织的网，捕捉转瞬即逝的时光。</p>
    </div>
    <div class="flex-1 p-6">
        <Statistics {items} />
    </div>
</div>
