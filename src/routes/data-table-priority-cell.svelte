<script lang="ts">
    import PrioritySelector from "$lib/components/priority-selector.svelte";
    import { Priority } from "$lib/types";

    export let rowId: string;
    export let value: Priority;

    export let onUpdateValue: (rowId: string, value: Priority) => void;

    function handlePriorityChange(event: CustomEvent) {
        onUpdateValue(rowId, event.detail.priority);
    }
</script>

<div>
    <PrioritySelector priority={value} variant="outline" class="" on:change={handlePriorityChange} />
</div>
