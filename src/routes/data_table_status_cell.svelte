<script lang="ts">
    import { DataColumn, BodyRow } from "svelte-headless-table";
    import StatusSelector from "$lib/components/StatusSelector.svelte";
    import { TaskStatus } from "$lib/types";

    export let row: BodyRow<any>;
    export let column: DataColumn<any>;
    export let value: TaskStatus;

    export let onUpdateValue: (row: string, col: string, value: TaskStatus) => void;

    function handleStatusChange(event: CustomEvent) {
        if (row.isData()) {
            onUpdateValue(row.dataId, column.id, event.detail.status);
        } else {
            console.error("Row is not DataBodyRow type");
        }
    }
</script>

<div>
    <StatusSelector status={value} on:change={handleStatusChange} />
</div>
