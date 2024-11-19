<script lang="ts">
    import Statistics from "$lib/components/Statistics.svelte";
    import type { TimelineItem } from "$lib/types";
    let { items }: { items: TimelineItem[] } = $props();
</script>

<div class="p-6">
    <Statistics {items} />
</div>
