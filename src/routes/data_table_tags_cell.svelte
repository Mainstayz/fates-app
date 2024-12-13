<script lang="ts">
    import { Badge } from "$lib/components/ui/badge";
    import { Label } from "$lib/components/ui/label";
    // https://svelte.dev/playground/44e2a26454ad478aa27e92b89e82e680?version=3.49.0

    export let tags: string[];
    // trim,filter value, remove duplicate,
    let filteredTags = tags.map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
    let uniqueTags = [...new Set(filteredTags)];
</script>

<div>
    {#if uniqueTags.length > 0}
        {#each uniqueTags as tag}
            <Badge>{tag}</Badge>
        {/each}
    {:else}
        <Label class="text-muted-foreground">-</Label>
    {/if}
</div>
