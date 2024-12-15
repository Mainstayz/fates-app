<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Trash2 } from "lucide-svelte";
    import StatusSelector from "$lib/components/StatusSelector.svelte";
    import type { TaskStatus } from "$lib/types";

    export let row: any;
    export let original: any;
    export let onDelete: (rowId: string) => void;
    export let onUpdateValue: (rowId: string, columnId: string, value: any) => void;

    let status: TaskStatus = original.status;
    const handleDelete = () => {
        onDelete(row.id);
    };

    const handleStatusChange = (newStatus: TaskStatus) => {
        onUpdateValue(row.id, "status", newStatus);
    };
</script>

<div class="flex items-center gap-2">
    <StatusSelector {status} variant="ghost" onStatusValueChange={handleStatusChange} />
    <Button variant="ghost" size="icon" onclick={handleDelete}>
        <Trash2 class="h-4 w-4" />
    </Button>
</div>
