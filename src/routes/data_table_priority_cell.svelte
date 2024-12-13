<script lang="ts">
    import { DataColumn, BodyRow } from "svelte-headless-table";
    import PrioritySelector from "$lib/components/PrioritySelector.svelte";
    import { Priority } from "$lib/types";

    export let row: BodyRow<any>;
    export let column: DataColumn<any>;
    export let value: Priority;

    export let onUpdateValue: (row: string, col: string, value: Priority) => void;

    function handlePriorityChange(event: CustomEvent) {
        if (row.isData()) {
            onUpdateValue(row.dataId, column.id, event.detail.priority);
        } else {
            console.error("Row is not DataBodyRow type");
        }
    }
</script>

<div>
    <PrioritySelector priority={value} variant="ghost" on:change={handlePriorityChange} />
</div>
