<script lang="ts">
    import Statistics from "$lib/components/Statistics.svelte";
    import type { TimelineItem } from "$lib/types";
    import { Label } from "$lib/components/ui/label";
    let { items }: { items: TimelineItem[] } = $props();
    console.log("On reciver items: ", items);
</script>

<div class="flex flex-col h-full">
    <div class="flex flex-col px-6 pt-6 gap-4">
        <Label class="text-2xl font-bold tracking-tight">统计</Label>
        <Label class="text-base text-muted-foreground">一张用文字编织的网，捕捉转瞬即逝的时光。</Label>
    </div>
    <div class="flex-1 p-6">
        <Statistics {items} />
    </div>
</div>
