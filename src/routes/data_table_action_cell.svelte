<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Trash2 } from "lucide-svelte";

    import StatusSelector from "$lib/components/StatusSelector.svelte";
    import type { TaskStatus } from "$lib/types";

    export let rowId: string;
    export let original: any;
    export let onDelete: (rowId: string) => void;
    export let onUpdateValue: (rowId: string, value: TaskStatus) => void;

    let status: TaskStatus = original.status;
    const handleDelete = () => {
        onDelete(rowId);
    };

    const handleStatusChange = (newStatus: TaskStatus) => {
        onUpdateValue(rowId, newStatus);
    };
</script>

<div class="flex items-center gap-2">
    <StatusSelector {status} variant="ghost" onStatusValueChange={handleStatusChange} />
    <Button variant="ghost" size="icon" onclick={handleDelete}>
        <Trash2 class="h-4 w-4" />
    </Button>
</div>
