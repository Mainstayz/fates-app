<script lang="ts">
    import StatusSelector from "$lib/components/status-selector.svelte";
    import { TaskStatus } from "$lib/types";

    export let rowId: string;
    export let value: TaskStatus;

    export let onUpdateValue: (rowId: string, value: TaskStatus) => void;

    function handleStatusChange(newStatus: TaskStatus) {
        console.log("Received status change:", {
            newStatus,
            rowId,
        });
        onUpdateValue(rowId, newStatus);
    }
</script>

<div>
    <StatusSelector status={value} onStatusValueChange={handleStatusChange} />
</div>
