<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Trash } from "lucide-svelte";

    export let row: any;
    export let onDelete: (rowId: string) => void;
</script>

<div class="flex items-center">
    <Button variant="ghost" size="icon" onclick={() => onDelete(row.id)} class="h-8 w-8 p-0">
        <Trash class="h-4 w-4" />
    </Button>
</div>
